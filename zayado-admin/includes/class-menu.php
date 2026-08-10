<?php
defined('ABSPATH') || exit;

class Zayado_Menu {

    public static function init(): void {
        add_action('admin_menu', [self::class, 'register_menus']);
    }

    public static function register_menus(): void {
        // Menu principal
        add_menu_page(
            'MyExtension AI',
            'MyExtension AI',
            'manage_options',
            'zayado-dashboard',
            [Zayado_Dashboard::class, 'render'],
            self::svg_icon(),
            3
        );

        // Sous-menus
        $submenus = [
            ['zayado-dashboard',  'Vue d\'ensemble',     [Zayado_Dashboard::class,  'render']],
            ['zayado-users',      'Utilisateurs',        [Zayado_Users::class,      'render']],
            ['zayado-revenue',    'Revenus & plans',     [Zayado_Revenue::class,    'render']],
            ['zayado-emails',     'Emails IA (Brevo)',   [Zayado_Emails::class,     'render']],
            ['zayado-content-ai', 'Génération IA',       [Zayado_Content_AI::class, 'render']],
            ['zayado-crm',        'CRM & Contacts',     [Zayado_CRM::class,        'render']],
            ['zayado-affiliation', 'Affiliation & Partenaires', [Zayado_Affiliation::class, 'render']],
            ['zayado-config',     'Configuration',       [Zayado_Config::class,     'render']],
        ];

        foreach ($submenus as [$slug, $label, $callback]) {
            add_submenu_page(
                'zayado-dashboard',
                $label . ' — Zayado',
                $label,
                'manage_options',
                $slug,
                $callback
            );
        }
    }

    private static function svg_icon(): string {
        // Logo Z Zayado en SVG inline (base64 pour WordPress)
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16L4 18h16"/></svg>';
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
