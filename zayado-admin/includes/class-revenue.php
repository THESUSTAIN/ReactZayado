<?php
defined('ABSPATH') || exit;

class Zayado_Revenue {

    public static function render(): void {
        $res   = Zayado_API::get('/admin/transactions?limit=50');
        $data  = $res['success'] ? $res['data'] : null;
        $txs   = $data['transactions'] ?? $data ?? [];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>💰 Revenus & Transactions</h1>
            </div>

            <?php if (!$res['success']): ?>
                <div class="zayado-alert zayado-alert-error">⚠️ <?php echo esc_html($res['error']); ?></div>
            <?php else: ?>

            <!-- Stats revenus -->
            <?php
            $stats_res = Zayado_API::get('/admin/stats');
            $stats     = $stats_res['success'] ? $stats_res['data'] : [];
            ?>
            <div class="zayado-grid zayado-grid-4" style="margin-bottom:24px">
                <?php
                $rev_kpis = [
                    ['Revenus totaux',   number_format($stats['total_revenue'] ?? 0, 2) . ' €', '#5DCAA5'],
                    ['Revenus 30j',      number_format($stats['revenue_30d'] ?? 0, 2) . ' €',   '#D6A85F'],
                    ['Revenus 7j',       number_format($stats['revenue_7d'] ?? 0, 2) . ' €',    '#D6A85F'],
                    ['En attente',       number_format($stats['pending_revenue'] ?? 0, 2) . ' €','#f59e0b'],
                    ['Coût API total',   number_format($stats['total_api_cost'] ?? 0, 4) . ' €','#e05050'],
                    ['Marge 30j',        number_format($stats['margin_30d'] ?? 0, 2) . ' €',    '#5DCAA5'],
                    ['Utilisateurs payants', number_format($stats['paid_users'] ?? 0),           '#D6A85F'],
                    ['Taux conversion',  ($stats['conversion_rate'] ?? 0) . '%',                 '#5DCAA5'],
                ];
                foreach ($rev_kpis as [$label, $value, $color]):
                ?>
                <div class="zayado-card">
                    <div class="zayado-card-label"><?php echo esc_html($label); ?></div>
                    <div class="zayado-card-value" style="color:<?php echo esc_attr($color); ?>"><?php echo esc_html($value); ?></div>
                </div>
                <?php endforeach; ?>
            </div>

            <!-- Transactions -->
            <div class="zayado-section">
                <h2>Dernières transactions</h2>
                <div class="zayado-table-wrap">
                    <table class="zayado-table">
                        <thead>
                            <tr><th>ID</th><th>Email</th><th>Plan</th><th>Montant</th><th>Statut</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                            <?php if (empty($txs)): ?>
                            <tr><td colspan="6" class="zayado-empty">Aucune transaction.</td></tr>
                            <?php else: foreach ($txs as $tx): ?>
                            <tr>
                                <td><span class="zayado-mono"><?php echo esc_html(substr($tx['id'] ?? '—', 0, 8)); ?></span></td>
                                <td><?php echo esc_html($tx['user_email'] ?? $tx['email'] ?? '—'); ?></td>
                                <td><span class="zayado-pill zayado-pill-<?php echo esc_attr($tx['plan'] ?? 'free'); ?>"><?php echo strtoupper(esc_html($tx['plan'] ?? '—')); ?></span></td>
                                <td><strong><?php echo esc_html(number_format($tx['amount'] ?? 0, 2)); ?> €</strong></td>
                                <td>
                                    <?php
                                    $status = $tx['status'] ?? '—';
                                    $cls = $status === 'completed' ? 'green' : ($status === 'pending' ? 'amber' : 'red');
                                    ?>
                                    <span class="zayado-pill zayado-pill-<?php echo $cls; ?>"><?php echo esc_html($status); ?></span>
                                </td>
                                <td><?php echo $tx['created_at'] ? date('d/m/Y H:i', strtotime($tx['created_at'])) : '—'; ?></td>
                            </tr>
                            <?php endforeach; endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <?php endif; ?>
        </div>
        <?php
    }
}
