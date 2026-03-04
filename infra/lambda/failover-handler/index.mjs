import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";
import {
  S3Client,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
} from "@aws-sdk/client-ssm";

const {
  EC2_INSTANCE_ID,
  EC2_REGION,
  BUCKET_NAME,
  CLOUDFLARE_ZONE_ID,
  CLOUDFLARE_TOKEN,
  CLOUDFLARE_RECORD_ID,
  DOMAIN_NAME,
  TUNNEL_CNAME,
  HEARTBEAT_MAX_AGE_SECONDS,
} = process.env;

const ec2 = new EC2Client({ region: EC2_REGION });
const s3 = new S3Client({ region: EC2_REGION });
const ssm = new SSMClient({ region: EC2_REGION });

const MAX_AGE = parseInt(HEARTBEAT_MAX_AGE_SECONDS || "300", 10);

/**
 * Vérifie le heartbeat S3 pour savoir si le serveur maison est vivant
 */
async function isHomeServerAlive() {
  try {
    const { LastModified } = await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: "heartbeat.txt",
      })
    );

    const ageSeconds = (Date.now() - LastModified.getTime()) / 1000;
    console.log(`Heartbeat age: ${Math.round(ageSeconds)}s (max: ${MAX_AGE}s)`);

    return ageSeconds < MAX_AGE;
  } catch (error) {
    console.error("Impossible de lire le heartbeat:", error.message);
    return false;
  }
}

/**
 * Récupère le record DNS actuel dans Cloudflare
 */
async function getCurrentDNSRecord() {
  const url = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${CLOUDFLARE_RECORD_ID}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${CLOUDFLARE_TOKEN}` },
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
  }

  return data.result;
}

/**
 * Met à jour le record DNS Cloudflare (A record vers une IP)
 */
async function setDNStoEC2(ip) {
  const url = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${CLOUDFLARE_RECORD_ID}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "A",
      name: DOMAIN_NAME,
      content: ip,
      ttl: 60,
      proxied: true,
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
  }

  console.log(`DNS mis à jour: ${DOMAIN_NAME} → A ${ip}`);
  return data;
}

/**
 * Remet le DNS vers le Cloudflare Tunnel (CNAME)
 */
async function setDNStoTunnel() {
  const url = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${CLOUDFLARE_RECORD_ID}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "CNAME",
      name: DOMAIN_NAME,
      content: TUNNEL_CNAME,
      ttl: 60,
      proxied: true,
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
  }

  console.log(`DNS mis à jour: ${DOMAIN_NAME} → CNAME ${TUNNEL_CNAME}`);
  return data;
}

/**
 * Récupère l'état actuel de l'EC2
 */
async function getInstanceState() {
  const { Reservations } = await ec2.send(
    new DescribeInstancesCommand({
      InstanceIds: [EC2_INSTANCE_ID],
    })
  );

  const instance = Reservations[0]?.Instances[0];
  return {
    state: instance?.State?.Name,
    publicIp: instance?.PublicIpAddress,
  };
}

/**
 * Attend que l'instance atteigne l'état désiré
 */
async function waitForInstanceState(targetState, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    const { state, publicIp } = await getInstanceState();
    console.log(`Instance state: ${state} (attempt ${i + 1}/${maxAttempts})`);

    if (state === targetState) {
      return { state, publicIp };
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Instance n'a pas atteint l'état ${targetState}`);
}

/**
 * Détermine l'état du système failover en croisant DNS type + EC2 state.
 *
 * Normal:    DNS = CNAME tunnel, EC2 stopped
 * Failover:  DNS = A (EC2 IP),   EC2 running
 * Stale:     DNS = A,            EC2 stopped  → needs cleanup
 */
async function getFailoverStatus() {
  const record = await getCurrentDNSRecord();
  console.log(`DNS actuel: ${record.type} → ${record.content}`);

  const { state: ec2State, publicIp: ec2Ip } = await getInstanceState();
  console.log(`EC2 state: ${ec2State}${ec2Ip ? ` (IP: ${ec2Ip})` : ""}`);

  const dnsIsCname = record.type === "CNAME";
  const ec2Running = ec2State === "running";

  // Failover actif SEULEMENT si DNS est A record ET EC2 est running
  const inFailover = !dnsIsCname && ec2Running;

  if (!dnsIsCname && !ec2Running) {
    console.log("ÉTAT INCOHÉRENT: DNS en A record mais EC2 stoppé → nettoyage requis");
  }

  return { inFailover, dnsIsCname, ec2State, ec2Running, ec2Ip };
}

/**
 * Vérifie que l'app sur l'EC2 est accessible (health check HTTP)
 */
async function checkEC2Health(ip) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`http://${ip}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const ok = response.status >= 200 && response.status < 500;
    console.log(`Health check EC2 (${ip}): HTTP ${response.status} → ${ok ? "OK" : "KO"}`);
    return ok;
  } catch (error) {
    console.log(`Health check EC2 (${ip}): ÉCHEC (${error.message})`);
    return false;
  }
}

/**
 * Démarre le failover : EC2 start + DNS CNAME → A record EC2
 */
async function startFailover() {
  console.log("=== DÉMARRAGE DU FAILOVER ===");

  const { state } = await getInstanceState();

  if (state !== "stopped") {
    if (state === "running") {
      console.log("EC2 déjà running, vérification que l'app répond...");
      const { publicIp } = await getInstanceState();
      if (publicIp) {
        const healthy = await checkEC2Health(publicIp);
        if (healthy) {
          await setDNStoEC2(publicIp);
          return { action: "dns_update_only", ip: publicIp };
        }
        console.log("EC2 running mais app non accessible, on stoppe et redémarre...");
        await ec2.send(
          new StopInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] })
        );
        await waitForInstanceState("stopped");
      }
    } else {
      console.log(`EC2 dans l'état ${state}, attente du stop...`);
      await waitForInstanceState("stopped");
    }
  }

  // Démarrer l'instance
  console.log(`Démarrage de l'instance ${EC2_INSTANCE_ID}...`);
  await ec2.send(
    new StartInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] })
  );

  // Attendre que l'instance soit running
  const { publicIp } = await waitForInstanceState("running");
  console.log(`Instance démarrée avec IP: ${publicIp}`);

  // Attendre que l'app soit prête (health check en boucle, max 5 min)
  console.log("Attente du démarrage de l'application (health check toutes les 15s, max 5min)...");
  const maxWaitMs = 300000; // 5 min
  const intervalMs = 15000; // 15s
  const startTime = Date.now();
  let appReady = false;

  while (Date.now() - startTime < maxWaitMs) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const healthy = await checkEC2Health(publicIp);
    if (healthy) {
      console.log(`Application prête après ${elapsed}s`);
      appReady = true;
      break;
    }
    console.log(`App pas encore prête (${elapsed}s écoulées), retry dans 15s...`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (!appReady) {
    console.error("TIMEOUT: l'application n'a pas démarré après 5 min. DNS non basculé.");
    return { action: "failover_timeout", ip: publicIp };
  }

  // Basculer le DNS : CNAME tunnel → A record EC2
  await setDNStoEC2(publicIp);

  console.log("=== FAILOVER ACTIVÉ ===");
  return { action: "failover_started", ip: publicIp };
}

/**
 * Déclenche un backup final de la DB sur l'EC2 via SSM RunCommand
 */
async function triggerFinalBackup() {
  console.log("Déclenchement du backup final de la DB sur EC2...");

  try {
    const { Command } = await ssm.send(
      new SendCommandCommand({
        InstanceIds: [EC2_INSTANCE_ID],
        DocumentName: "AWS-RunShellScript",
        Parameters: {
          commands: ["/opt/auformat-next/infra/scripts/backup-db-ec2.sh"],
        },
        TimeoutSeconds: 120,
      })
    );

    const commandId = Command.CommandId;
    console.log(`SSM Command envoyée: ${commandId}`);

    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        const { Status, StatusDetails } = await ssm.send(
          new GetCommandInvocationCommand({
            CommandId: commandId,
            InstanceId: EC2_INSTANCE_ID,
          })
        );

        console.log(`SSM Command status: ${Status} (${StatusDetails})`);

        if (Status === "Success") {
          console.log("Backup final terminé avec succès");
          return true;
        }

        if (["Failed", "Cancelled", "TimedOut"].includes(Status)) {
          console.error(`Backup final échoué: ${StatusDetails}`);
          return false;
        }
      } catch (invocationError) {
        if (invocationError.name !== "InvocationDoesNotExist") {
          throw invocationError;
        }
      }
    }

    console.error("Backup final: timeout après 60s");
    return false;
  } catch (error) {
    console.error("Erreur SSM RunCommand:", error.message);
    return false;
  }
}

/**
 * Arrête le failover : backup final + DNS A → CNAME tunnel + EC2 stop
 */
async function stopFailover() {
  console.log("=== ARRÊT DU FAILOVER ===");

  // 1. Backup final de la DB avant de couper
  const backupOk = await triggerFinalBackup();
  if (!backupOk) {
    console.warn("ATTENTION: le backup final a échoué, on continue quand même");
  }

  // 2. Remettre le DNS vers le Cloudflare Tunnel
  await setDNStoTunnel();
  console.log("DNS remis vers le Cloudflare Tunnel");

  // 3. Attendre un peu avant de stopper
  console.log("Attente de 30s avant arrêt de l'EC2...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // 4. Stopper l'instance EC2
  await ec2.send(
    new StopInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] })
  );

  console.log("=== FAILOVER DÉSACTIVÉ ===");
  return { action: "failover_stopped", backupOk };
}

/**
 * Handler principal - invoqué par EventBridge toutes les 2 minutes
 */
export async function handler() {
  console.log(`=== Check failover - ${new Date().toISOString()} ===`);

  try {
    const serverAlive = await isHomeServerAlive();
    const { inFailover, dnsIsCname, ec2Running } = await getFailoverStatus();

    console.log(`Serveur maison: ${serverAlive ? "UP" : "DOWN"}`);
    console.log(`Mode failover: ${inFailover ? "ACTIF" : "INACTIF"}`);

    if (!serverAlive && !inFailover) {
      // Serveur down + pas encore en failover → DÉMARRER
      return await startFailover();
    }

    if (serverAlive && inFailover) {
      // Serveur de retour + encore en failover → ARRÊTER
      return await stopFailover();
    }

    // Nettoyage : serveur UP, DNS en A record (stale) mais EC2 stoppé
    if (serverAlive && !dnsIsCname && !ec2Running) {
      console.log("Nettoyage: DNS stale en A record, remise vers tunnel CNAME...");
      await setDNStoTunnel();
      return { action: "dns_cleanup" };
    }

    // Rien à faire
    console.log("Aucune action nécessaire");
    return { action: "no_change", serverAlive, inFailover };
  } catch (error) {
    console.error("Erreur:", error);
    throw error;
  }
}
