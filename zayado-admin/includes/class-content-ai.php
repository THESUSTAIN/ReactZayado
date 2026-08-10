<?php
defined('ABSPATH') || exit;

/**
 * Zayado_Content_AI
 * Génération IA d'articles SEO, descriptions produits WooCommerce,
 * et pages éditoriales — publiés directement sur WordPress.
 */
class Zayado_Content_AI {

    public static function render(): void {
        $message = '';
        $preview = null;

        // ── Traitement POST ───────────────────────────────────
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('zayado_content_ai')) {
            $action = sanitize_text_field($_POST['zayado_action'] ?? '');

            if ($action === 'propose_topics') {
                $res     = Zayado_API::post('/admin/articles/propose', []);
                $preview = $res['success'] ? $res['data'] : null;
                if (!$res['success']) $message = '❌ ' . $res['error'];
            }

            if ($action === 'generate_article') {
                $topic    = sanitize_text_field($_POST['topic'] ?? '');
                $category = sanitize_text_field($_POST['category'] ?? 'Blog');
                $publish  = isset($_POST['publish_wp']);
                $res      = Zayado_API::post('/admin/articles/generate', [
                    'topic'      => $topic,
                    'category'   => $category,
                    'publish_wp' => $publish,
                ]);
                $message = $res['success']
                    ? '✅ Article généré' . ($publish ? ' et publié sur WordPress !' : ' — en brouillon.')
                    : '❌ ' . $res['error'];
            }

            if ($action === 'generate_product') {
                $name    = sanitize_text_field($_POST['product_name'] ?? '');
                $price   = floatval($_POST['product_price'] ?? 0);
                $publish = isset($_POST['publish_wc']);
                $res     = Zayado_API::post('/admin/wordpress/ai-product', [
                    'name'       => $name,
                    'price'      => $price,
                    'publish_wc' => $publish,
                ]);
                $message = $res['success']
                    ? '✅ Produit généré' . ($publish ? ' et publié sur WooCommerce !' : ' — en brouillon.')
                    : '❌ ' . $res['error'];
            }

            if ($action === 'generate_page') {
                $page_type = sanitize_text_field($_POST['page_type'] ?? '');
                $publish   = isset($_POST['publish_page']);
                $res       = Zayado_API::post('/admin/wordpress/ai-page', [
                    'page_type' => $page_type,
                    'publish'   => $publish,
                ]);
                $message = $res['success']
                    ? '✅ Page générée' . ($publish ? ' et publiée sur WordPress !' : ' — en brouillon.')
                    : '❌ ' . $res['error'];
            }

            if ($action === 'approve_article') {
                $article_id = intval($_POST['article_id'] ?? 0);
                $res        = Zayado_API::post("/admin/articles/{$article_id}/approve", []);
                $message    = $res['success'] ? '✅ Article approuvé et publié !' : '❌ ' . $res['error'];
            }
        }

        // ── Chargement des articles existants ─────────────────
        $articles_res = Zayado_API::get('/admin/articles');
        $articles     = $articles_res['success'] ? ($articles_res['data'] ?? []) : [];

        // ── Chargement des produits WP ─────────────────────────
        $products_res = Zayado_API::get('/wp/products?per_page=20');
        $products     = $products_res['success'] ? ($products_res['data']['products'] ?? []) : [];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>✨ Génération IA de contenu</h1>
                <p class="zayado-subtitle">Articles SEO, descriptions produits WooCommerce, pages éditoriales — générés par Claude et publiés sur WordPress.</p>
            </div>

            <?php if ($message): ?>
            <div class="zayado-alert <?php echo strpos($message, '✅') !== false ? 'zayado-alert-success' : 'zayado-alert-error'; ?>">
                <?php echo esc_html($message); ?>
            </div>
            <?php endif; ?>

            <!-- Tabs -->
            <div class="zayado-tabs">
                <button class="zayado-tab active" data-tab="articles">📝 Articles SEO</button>
                <button class="zayado-tab" data-tab="products">🛒 Produits WooCommerce</button>
                <button class="zayado-tab" data-tab="pages">📄 Pages éditoriales</button>
            </div>

            <!-- ── TAB : Articles SEO ── -->
            <div class="zayado-tab-content active" id="tab-articles">
                <div class="zayado-grid zayado-grid-2">

                    <!-- Générer un article -->
                    <div class="zayado-card-full">
                        <h2>🤖 Générer un article</h2>

                        <!-- Proposer des sujets IA -->
                        <form method="post" style="margin-bottom:16px">
                            <?php wp_nonce_field('zayado_content_ai'); ?>
                            <input type="hidden" name="zayado_action" value="propose_topics" />
                            <button type="submit" class="zayado-btn zayado-btn-gold">
                                💡 Proposer 3 sujets SEO avec l'IA
                            </button>
                        </form>

                        <?php if (!empty($preview['topics'])): ?>
                        <div class="zayado-info-box" style="margin-bottom:16px">
                            <strong>Sujets proposés — cliquez pour générer :</strong>
                            <?php foreach ($preview['topics'] as $t): ?>
                            <form method="post" style="margin-top:8px;display:inline-block;margin-right:8px">
                                <?php wp_nonce_field('zayado_content_ai'); ?>
                                <input type="hidden" name="zayado_action" value="generate_article" />
                                <input type="hidden" name="topic" value="<?php echo esc_attr($t['topic']); ?>" />
                                <input type="hidden" name="category" value="<?php echo esc_attr($t['category']); ?>" />
                                <input type="hidden" name="publish_wp" value="1" />
                                <button type="submit" class="zayado-btn-sm zayado-btn-gold">
                                    ✍️ <?php echo esc_html($t['topic']); ?>
                                    <span style="opacity:.6;font-size:11px">(<?php echo esc_html($t['category']); ?>)</span>
                                </button>
                            </form>
                            <?php endforeach; ?>
                        </div>
                        <?php endif; ?>

                        <!-- Formulaire manuel -->
                        <form method="post">
                            <?php wp_nonce_field('zayado_content_ai'); ?>
                            <input type="hidden" name="zayado_action" value="generate_article" />
                            <div class="zayado-form-row">
                                <label>Sujet de l'article</label>
                                <input type="text" name="topic" required class="zayado-input"
                                    placeholder="Ex: Comment prévenir le burn-out en tant que solopreneur" />
                            </div>
                            <div class="zayado-form-row">
                                <label>Catégorie</label>
                                <select name="category" class="zayado-select">
                                    <?php foreach (['Blog', 'SEO', 'Bien-être', 'Business', 'Entrepreneur', 'Finance', 'IA & Outils'] as $cat): ?>
                                    <option value="<?php echo esc_attr($cat); ?>"><?php echo esc_html($cat); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="zayado-form-row">
                                <label>
                                    <input type="checkbox" name="publish_wp" checked />
                                    Publier directement sur WordPress (cms.zayado.net)
                                </label>
                            </div>
                            <button type="submit" class="zayado-btn zayado-btn-gold">✨ Générer l'article</button>
                        </form>
                    </div>

                    <!-- Articles existants -->
                    <div class="zayado-card-full">
                        <h2>📋 Articles générés</h2>
                        <?php if (empty($articles)): ?>
                            <p class="zayado-empty">Aucun article généré pour le moment.</p>
                        <?php else: ?>
                        <div class="zayado-table-wrap">
                            <table class="zayado-table">
                                <thead><tr><th>Titre</th><th>Catégorie</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
                                <tbody>
                                <?php foreach ($articles as $art): ?>
                                <tr>
                                    <td><?php echo esc_html(wp_trim_words($art['title'] ?? '—', 8)); ?></td>
                                    <td><?php echo esc_html($art['category'] ?? '—'); ?></td>
                                    <td>
                                        <?php $s = $art['status'] ?? '—'; $cls = $s === 'published' ? 'green' : 'amber'; ?>
                                        <span class="zayado-pill zayado-pill-<?php echo $cls; ?>"><?php echo esc_html($s); ?></span>
                                    </td>
                                    <td><?php echo $art['created_at'] ? date('d/m/Y', strtotime($art['created_at'])) : '—'; ?></td>
                                    <td>
                                        <?php if (($art['status'] ?? '') !== 'published'): ?>
                                        <form method="post" style="display:inline">
                                            <?php wp_nonce_field('zayado_content_ai'); ?>
                                            <input type="hidden" name="zayado_action" value="approve_article" />
                                            <input type="hidden" name="article_id" value="<?php echo esc_attr($art['id']); ?>" />
                                            <button type="submit" class="zayado-btn-sm zayado-btn-gold">✅ Approuver</button>
                                        </form>
                                        <?php endif; ?>
                                        <?php if (!empty($art['wp_url'])): ?>
                                        <a href="<?php echo esc_url($art['wp_url']); ?>" target="_blank" class="zayado-btn-sm">🔗 Voir</a>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- ── TAB : Produits WooCommerce ── -->
            <div class="zayado-tab-content" id="tab-products" style="display:none">
                <div class="zayado-grid zayado-grid-2">

                    <div class="zayado-card-full">
                        <h2>🛒 Générer une fiche produit</h2>
                        <div class="zayado-info-box">
                            💡 L'IA génère le titre, la description courte, la description longue, les tags SEO et les bénéfices — directement depuis le nom et le prix.
                        </div>
                        <form method="post">
                            <?php wp_nonce_field('zayado_content_ai'); ?>
                            <input type="hidden" name="zayado_action" value="generate_product" />
                            <div class="zayado-form-row">
                                <label>Nom du produit</label>
                                <input type="text" name="product_name" required class="zayado-input"
                                    placeholder="Ex: Lampe de luminothérapie 10 000 lux" />
                            </div>
                            <div class="zayado-form-row">
                                <label>Prix (€)</label>
                                <input type="number" name="product_price" step="0.01" min="0" class="zayado-input" placeholder="89.00" />
                            </div>
                            <div class="zayado-form-row">
                                <label>
                                    <input type="checkbox" name="publish_wc" checked />
                                    Publier directement sur WooCommerce
                                </label>
                            </div>
                            <button type="submit" class="zayado-btn zayado-btn-gold">✨ Générer la fiche produit</button>
                        </form>
                    </div>

                    <div class="zayado-card-full">
                        <h2>📦 Produits WooCommerce existants</h2>
                        <?php if (empty($products)): ?>
                            <p class="zayado-empty">Aucun produit trouvé. Vérifiez la connexion WordPress dans Configuration.</p>
                        <?php else: ?>
                        <div class="zayado-table-wrap">
                            <table class="zayado-table">
                                <thead><tr><th>Produit</th><th>Prix</th><th>Statut</th><th>Action</th></tr></thead>
                                <tbody>
                                <?php foreach ($products as $prod): ?>
                                <tr>
                                    <td><?php echo esc_html($prod['name'] ?? '—'); ?></td>
                                    <td><?php echo esc_html($prod['price'] ?? '—'); ?> €</td>
                                    <td>
                                        <?php $s = $prod['status'] ?? '—'; ?>
                                        <span class="zayado-pill zayado-pill-<?php echo $s === 'publish' ? 'green' : 'amber'; ?>">
                                            <?php echo esc_html($s === 'publish' ? 'Publié' : $s); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php if (!empty($prod['permalink'])): ?>
                                        <a href="<?php echo esc_url($prod['permalink']); ?>" target="_blank" class="zayado-btn-sm">🔗 Voir</a>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- ── TAB : Pages éditoriales ── -->
            <div class="zayado-tab-content" id="tab-pages" style="display:none">
                <div class="zayado-card-full">
                    <h2>📄 Générer une page éditoriale</h2>
                    <div class="zayado-info-box">
                        💡 L'IA génère le contenu complet d'une page publique Zayado (À propos, Services, FAQ, Landing) et la publie sur WordPress.
                    </div>
                    <form method="post">
                        <?php wp_nonce_field('zayado_content_ai'); ?>
                        <input type="hidden" name="zayado_action" value="generate_page" />
                        <div class="zayado-form-row">
                            <label>Type de page</label>
                            <select name="page_type" class="zayado-select">
                                <?php foreach ([
                                    'about'    => 'À propos de Zayado',
                                    'services' => 'Nos services mutualisés',
                                    'faq'      => 'Questions fréquentes (FAQ)',
                                    'pricing'  => 'Tarifs & plans',
                                    'landing'  => 'Landing page principale',
                                    'creation' => 'Création d\'entreprise à 1€',
                                    'blog'     => 'Page blog / articles',
                                ] as $val => $label): ?>
                                <option value="<?php echo esc_attr($val); ?>"><?php echo esc_html($label); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="zayado-form-row">
                            <label>
                                <input type="checkbox" name="publish_page" checked />
                                Publier directement sur WordPress
                            </label>
                        </div>
                        <button type="submit" class="zayado-btn zayado-btn-gold">✨ Générer la page</button>
                    </form>
                </div>
            </div>

        </div><!-- .zayado-wrap -->
        <?php
    }
}
