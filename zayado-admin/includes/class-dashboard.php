<?php
defined('ABSPATH') || exit;

class Zayado_Dashboard {

    public static function render(): void {
        // Statut de connexion — indépendant du reste de la page, toujours affiché,
        // pour voir en un coup d'œil si WordPress ↔ backend fonctionne, même si
        // /admin/stats plante ou renvoie quelque chose d'inattendu.
        // Timeout volontairement court (8s) : si le backend est lent/HS, la page
        // doit quand même se charger et afficher un statut rouge, au lieu de rester
        // bloquée jusqu'au max_execution_time du serveur (page blanche).
        $conn_res = Zayado_API::get('/admin/config', 8);
        $conn_ok  = $conn_res['success'];

        $res   = $conn_ok ? Zayado_API::get('/admin/stats', 10) : ['success' => false, 'error' => 'Ignoré : la connexion a déjà échoué ci-dessus.'];
        $stats = $res['success'] ? $res['data'] : null;
        $error = $res['success'] ? null : $res['error'];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>📊 Vue d'ensemble — MyExtension AI</h1>
                <p class="zayado-subtitle">Données en temps réel depuis le backend Zayado.</p>
            </div>

            <!-- Statut de connexion -->
            <div class="zayado-alert <?php echo $conn_ok ? 'zayado-alert-success' : 'zayado-alert-error'; ?>"
                 style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
                <span>
                    <?php if ($conn_ok): ?>
                        🟢 <strong>Connexion backend : OK</strong> — le plugin WordPress communique correctement avec l'API FastAPI et le token admin est valide.
                    <?php else: ?>
                        🔴 <strong>Connexion backend : ÉCHEC</strong> — <?php echo esc_html($conn_res['error']); ?>
                    <?php endif; ?>
                </span>
                <a href="<?php echo admin_url('admin.php?page=zayado-dashboard'); ?>" class="zayado-btn">🔄 Retester maintenant</a>
                <?php if (!$conn_ok): ?>
                <a href="<?php echo admin_url('admin.php?page=zayado-config'); ?>" class="zayado-btn zayado-btn-gold">⚙️ Aller à la configuration</a>
                <?php endif; ?>
            </div>

            <?php if (!$conn_ok): ?>
                <!-- La connexion a déjà échoué (bandeau rouge ci-dessus) : inutile de dupliquer le message. -->
            <?php elseif ($error): ?>
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

            <?php elseif ($res['success']): ?>
                <div class="zayado-alert zayado-alert-error">
                    ⚠️ Le backend a répondu mais sans données exploitables (réponse vide ou format inattendu).
                    <br>Vérifiez les logs du backend FastAPI (endpoint <code>/admin/stats</code>) et que la base de données contient bien des enregistrements.
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
}
