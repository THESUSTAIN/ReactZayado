<?php
defined('ABSPATH') || exit;

class Zayado_Users {

    public static function render(): void {
        // Actions POST
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('zayado_users')) {
            self::handle_action();
        }

        $page   = max(1, intval($_GET['paged'] ?? 1));
        $search = sanitize_text_field($_GET['s'] ?? '');
        $plan   = sanitize_text_field($_GET['plan'] ?? '');
        $skip   = ($page - 1) * 20;

        $endpoint = "/admin/users?skip={$skip}&limit=20";
        if ($search) $endpoint .= '&search=' . urlencode($search);
        if ($plan)   $endpoint .= '&plan=' . urlencode($plan);

        $res   = Zayado_API::get($endpoint);
        $data  = $res['success'] ? $res['data'] : null;
        $users = $data['users'] ?? [];
        $total = $data['total'] ?? 0;
        $pages = $data['total_pages'] ?? 1;
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>👥 Utilisateurs</h1>
                <p class="zayado-subtitle"><?php echo number_format($total); ?> utilisateurs au total</p>
            </div>

            <?php if (!$res['success']): ?>
                <div class="zayado-alert zayado-alert-error">⚠️ <?php echo esc_html($res['error']); ?></div>
            <?php else: ?>

            <!-- Filtres -->
            <form method="get" class="zayado-filters">
                <input type="hidden" name="page" value="zayado-users" />
                <input type="text" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Rechercher email, nom…" class="zayado-input" />
                <select name="plan" class="zayado-select">
                    <option value="">Tous les plans</option>
                    <?php foreach (['free','start','grow','serenity'] as $p): ?>
                    <option value="<?php echo $p; ?>" <?php selected($plan, $p); ?>><?php echo strtoupper($p); ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="zayado-btn">Filtrer</button>
            </form>

            <!-- Table -->
            <div class="zayado-table-wrap">
                <table class="zayado-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Nom</th>
                            <th>Plan</th>
                            <th>Crédits</th>
                            <th>Inscrit le</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($users)): ?>
                        <tr><td colspan="6" class="zayado-empty">Aucun utilisateur trouvé.</td></tr>
                        <?php else: foreach ($users as $user): ?>
                        <tr>
                            <td><span class="zayado-mono"><?php echo esc_html($user['email']); ?></span></td>
                            <td><?php echo esc_html($user['name'] ?? '—'); ?></td>
                            <td>
                                <span class="zayado-pill zayado-pill-<?php echo esc_attr($user['plan'] ?? 'free'); ?>">
                                    <?php echo strtoupper(esc_html($user['plan'] ?? 'free')); ?>
                                </span>
                            </td>
                            <td><?php echo number_format($user['credits'] ?? 0); ?></td>
                            <td><?php echo $user['created_at'] ? date('d/m/Y', strtotime($user['created_at'])) : '—'; ?></td>
                            <td>
                                <form method="post" style="display:inline">
                                    <?php wp_nonce_field('zayado_users'); ?>
                                    <input type="hidden" name="zayado_action" value="change_plan" />
                                    <input type="hidden" name="user_id" value="<?php echo esc_attr($user['id']); ?>" />
                                    <select name="new_plan" class="zayado-select-sm">
                                        <?php foreach (['free','start','grow','serenity'] as $p): ?>
                                        <option value="<?php echo $p; ?>" <?php selected($user['plan'] ?? 'free', $p); ?>><?php echo strtoupper($p); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <button type="submit" class="zayado-btn-sm">Changer</button>
                                </form>
                                <form method="post" style="display:inline;margin-left:4px">
                                    <?php wp_nonce_field('zayado_users'); ?>
                                    <input type="hidden" name="zayado_action" value="gift_credits" />
                                    <input type="hidden" name="user_id" value="<?php echo esc_attr($user['id']); ?>" />
                                    <input type="number" name="credits" value="100" min="1" max="10000" class="zayado-input-sm" />
                                    <button type="submit" class="zayado-btn-sm zayado-btn-gold">+Crédits</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; endif; ?>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <?php if ($pages > 1): ?>
            <div class="zayado-pagination">
                <?php for ($i = 1; $i <= $pages; $i++): ?>
                <a href="<?php echo add_query_arg(['paged' => $i, 's' => $search, 'plan' => $plan]); ?>"
                   class="zayado-page-btn <?php echo $i === $page ? 'active' : ''; ?>">
                    <?php echo $i; ?>
                </a>
                <?php endfor; ?>
            </div>
            <?php endif; ?>

            <?php endif; ?>
        </div>
        <?php
    }

    private static function handle_action(): void {
        $action  = sanitize_text_field($_POST['zayado_action'] ?? '');
        $user_id = sanitize_text_field($_POST['user_id'] ?? '');

        if ($action === 'change_plan' && $user_id) {
            $plan = sanitize_text_field($_POST['new_plan'] ?? 'free');
            $res  = Zayado_API::put("/admin/users/{$user_id}/plan", ['plan' => $plan]);
            if ($res['success']) {
                add_settings_error('zayado', 'ok', "Plan mis à jour → " . strtoupper($plan), 'updated');
            } else {
                add_settings_error('zayado', 'err', "Erreur : " . $res['error'], 'error');
            }
        }

        if ($action === 'gift_credits' && $user_id) {
            $credits = intval($_POST['credits'] ?? 100);
            $res     = Zayado_API::post("/admin/users/{$user_id}/credits", ['amount' => $credits, 'reason' => 'Admin WP gift']);
            if ($res['success']) {
                add_settings_error('zayado', 'ok', "{$credits} crédits offerts.", 'updated');
            } else {
                add_settings_error('zayado', 'err', "Erreur : " . $res['error'], 'error');
            }
        }

        if ($action === 'ban' && $user_id) {
            $res = Zayado_API::post("/admin/users/{$user_id}/ban", []);
            if ($res['success']) {
                add_settings_error('zayado', 'ok', "Utilisateur banni.", 'updated');
            }
        }

        settings_errors('zayado');
    }
}
