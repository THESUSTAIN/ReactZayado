/* Zayado Admin Plugin — JavaScript */
jQuery(function ($) {

    // ── Tabs ──────────────────────────────────────────────────
    $('.zayado-tab').on('click', function () {
        const target = $(this).data('tab');
        $('.zayado-tab').removeClass('active');
        $(this).addClass('active');
        $('.zayado-tab-content').hide();
        $('#tab-' + target).show();
    });

    // ── Confirmation avant actions dangereuses ────────────────
    $('button[name="zayado_action"][value="ban"]').on('click', function (e) {
        if (!confirm('Confirmer le bannissement de cet utilisateur ?')) {
            e.preventDefault();
        }
    });

    // ── Auto-dismiss des alerts après 5s ─────────────────────
    setTimeout(function () {
        $('.zayado-alert').fadeOut(400);
    }, 5000);

    // ── AJAX call helper (pour futures interactions) ──────────
    window.zayadoAjax = function (endpoint, method, body, callback) {
        $.post(ZayadoAdmin.ajaxUrl, {
            action:   'zayado_api',
            nonce:    ZayadoAdmin.nonce,
            endpoint: endpoint,
            method:   method,
            body:     body ? JSON.stringify(body) : null,
        }, function (res) {
            if (typeof callback === 'function') callback(res);
        });
    };
});
