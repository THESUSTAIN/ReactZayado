<?php
defined('ABSPATH') || exit;

class Zayado_Dashboard {

    public static function render(): void {
        $res   = Zayado_API::get('/admin/stats');
        $stats = $res['success'] ? $res['data'] : null;
        $error = $res['success'] ? null : $res['error'];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>📊 Vue d'ensemble — MyExtension AI</h1>
                <p class="zayado-subtitle">Données en temps réel depuis le backend Zayado.</p>
            </div>

            <?php if ($error): ?>
                <div class="zayado-alert zayado-alert-error">
                    ⚠️ <?php echo esc_html($error); ?>
                    <br><a href="<?php echo admin_url('admin.php?page=zayado-config'); ?>">→ Configurer la connexion</a>
                </div>
            <?php elseif ($stats): ?>

            <!-- KPI Cards -->
            <div class="zayado-grid zayado-grid-4">
                <?php
                $kpis = [
                    ['label' => 'Utilisateurs total',   'value' => number_format($stats['total_users'] ?? 0),          'color' => '#D6A85F', 'icon' => '👥'],
                    ['label' => 'MRR (revenus 30j)',    'value' => number_format($stats['revenue_30d'] ?? 0, 2) . ' €', 'color' => '#5DCAA5', 'icon' => '💰'],
                    ['label' => 'Marge mensuelle',      'value' => number_format($stats['margin_30d'] ?? 0, 2) . ' €',  'color' => '#5DCAA5', 'icon' => '📈'],
                    ['label' => 'Taux de conversion',   'value' => ($stats['conversion_rate'] ?? 0) . '%',              'color' => '#D6A85F', 'icon' => '🎯'],
                    ['label' => 'Inscrits 7 jours',     'value' => number_format($stats['new_users_7d'] ?? 0),          'color' => '#60a5fa', 'icon' => '📅'],
                    ['label' => 'Inscrits aujourd\'hui', 'value' => number_format($stats['new_users_today'] ?? 0),       'color' => '#60a5fa', 'icon' => '🌅'],
                    ['label' => 'Revenus en attente',   'value' => number_format($stats['pending_revenue'] ?? 0, 2) . ' €', 'color' => '#f59e0b', 'icon' => '⏳'],
                    ['label' => 'Coût API IA (30j)',    'value' => number_format($stats['api_cost_30d'] ?? 0, 4) . ' €', 'color' => '#e05050', 'icon' => '🤖'],
                ];
                foreach ($kpis as $kpi):
                ?>
                <div class="zayado-card">
                    <div class="zayado-card-icon"><?php echo $kpi['icon']; ?></div>
                    <div class="zayado-card-label"><?php echo esc_html($kpi['label']); ?></div>
                    <div class="zayado-card-value" style="color:<?php echo esc_attr($kpi['color']); ?>">
                        <?php echo esc_html($kpi['value']); ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

            <!-- Plans distribution -->
            <?php if (!empty($stats['plans_distribution'])): ?>
            <div class="zayado-section">
                <h2>Répartition par plan</h2>
                <div class="zayado-grid zayado-grid-4">
                    <?php
                    $colors = ['free' => '#94a3b8', 'start' => '#60a5fa', 'grow' => '#D6A85F', 'serenity' => '#5DCAA5'];
                    foreach ($stats['plans_distribution'] as $plan => $count):
                        $color = $colors[$plan] ?? '#94a3b8';
                    ?>
                    <div class="zayado-card">
                        <div class="zayado-card-label"><?php echo strtoupper(esc_html($plan)); ?></div>
                        <div class="zayado-card-value" style="color:<?php echo esc_attr($color); ?>">
                            <?php echo number_format($count); ?> utilisateurs
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- Graphe inscriptions 7 jours -->
            <?php if (!empty($stats['daily_signups'])): ?>
            <div class="zayado-section">
                <h2>Inscriptions — 7 derniers jours</h2>
                <div class="zayado-chart-bar">
                    <?php
                    $max = max(array_column($stats['daily_signups'], 'count') ?: [1]);
                    foreach ($stats['daily_signups'] as $day):
                        $pct = $max > 0 ? round(($day['count'] / $max) * 100) : 0;
                    ?>
                    <div class="zayado-bar-col">
                        <div class="zayado-bar-val"><?php echo esc_html($day['count']); ?></div>
                        <div class="zayado-bar" style="height:<?php echo $pct; ?>%"></div>
                        <div class="zayado-bar-label"><?php echo esc_html($day['date']); ?></div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <?php endif; ?>
        </div>
        <?php
    }
}
