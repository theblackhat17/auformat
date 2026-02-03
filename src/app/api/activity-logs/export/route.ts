import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const logs = await query<{
      createdAt: string;
      fullName: string | null;
      email: string | null;
      actionType: string;
      targetType: string;
      details: Record<string, unknown> | null;
      ipAddress: string | null;
      success: boolean;
    }>(
      `SELECT al.created_at, al.action_type, al.target_type, al.details, al.ip_address, al.success,
              p.full_name, p.email
       FROM activity_logs al
       LEFT JOIN profiles p ON al.user_id = p.id
       ORDER BY al.created_at DESC`
    );

    const BOM = '\uFEFF';
    const headers = 'Date,Heure,Utilisateur,Email,Action,Type,Details,IP,Statut\n';
    const rows = logs
      .map((log) => {
        const date = new Date(log.createdAt);
        return [
          date.toLocaleDateString('fr-FR'),
          date.toLocaleTimeString('fr-FR'),
          (log.fullName || 'N/A').replace(/,/g, ';'),
          log.email || 'N/A',
          log.actionType,
          log.targetType,
          ((log.details as Record<string, string>)?.description || '').replace(/,/g, ';'),
          log.ipAddress || 'N/A',
          log.success ? 'Succes' : 'Erreur',
        ]
          .map((cell) => `"${cell}"`)
          .join(',');
      })
      .join('\n');

    return new NextResponse(BOM + headers + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=logs_${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch (err) {
    console.error('Export logs error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
