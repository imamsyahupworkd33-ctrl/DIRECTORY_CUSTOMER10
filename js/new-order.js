/**
 * Pesan LANGGANAN BARU (BEM / SEM / LEM) — pelanggan. Butuh sql/katalog-pesan-baru.sql.
 * Alurnya sama dengan Perpanjang: pelanggan kirim permintaan -> Menunggu Konfirmasi ->
 * admin setujui di dashboard (tab paket yang dipesan) -> langganan baru masuk Dashboard Aktif.
 */
Object.assign(TRANSLATIONS.id, {
    no_btn: "Pesan Langganan Baru", no_modal_title: "Pesan Langganan Baru",
    no_sub: "Pilih paket, durasi, dan tagar untuk langganan baru Anda.",
    no_tag_ph: "cth. #tagarbaru", no_info: "Setelah dikirim, pesanan Anda berstatus Menunggu Konfirmasi sampai admin memprosesnya.",
    no_send: "Kirim Pesanan", no_sent_title: "Pesanan Terkirim", no_pill: "Pesanan baru",
    no_err_dup: "Pesanan dengan tagar ini masih menunggu konfirmasi",
    no_wa_text: "Halo admin, saya {u} ingin memesan langganan baru.\nTagar: {tag}\nPaket: {pkg}\nDurasi: {d} hari\nMohon dikonfirmasi. (ID #{id})",
    rn_tab: "Pesan & Perpanjang", rn_list_title: "Permintaan Saya", rn_list_empty: "Belum ada permintaan.",
    rn_list_empty_sub: "Tekan Pesan Langganan Baru, atau Perpanjang pada langganan yang sudah limit."
});
Object.assign(TRANSLATIONS.en, {
    no_btn: "Order New Subscription", no_modal_title: "Order New Subscription",
    no_sub: "Choose the package, duration and tag for your new subscription.",
    no_tag_ph: "e.g. #newtag", no_info: "After sending, your order is marked Awaiting Confirmation until the admin processes it.",
    no_send: "Send Order", no_sent_title: "Order Sent", no_pill: "New order",
    no_err_dup: "An order with this tag is still awaiting confirmation",
    no_wa_text: "Hello admin, I'm {u} and I'd like to order a new subscription.\nTag: {tag}\nPackage: {pkg}\nDuration: {d} days\nPlease confirm. (ID #{id})",
    rn_tab: "Order & Renew", rn_list_title: "My Requests", rn_list_empty: "No requests yet.",
    rn_list_empty_sub: "Tap Order New Subscription, or Renew on a subscription that reached the limit."
});
Object.assign(SERVER_ERROR_MAP, {
    "Tagar wajib diisi": "rn_err_tag",
    "Pesanan dengan tagar ini masih menunggu konfirmasi": "no_err_dup"
});

function openNewOrderModal() {
    const st = { hari: 30, pkg: "BEM" };
    $("modalBox").innerHTML = `
        <div class="rn-head"><div class="rn-icon">🛒</div>
            <div><div class="modal-title" style="margin:0">${escapeHtml(t("no_modal_title"))}</div>
            <div class="rn-sub">${escapeHtml(t("no_sub"))}</div></div></div>

        <div class="rn-block">
            <div class="rn-label">${escapeHtml(t("rn_pkg_label"))}</div>
            <div class="rn-pkgs" id="noPkgs">${RN_PKGS.map(p => `<button type="button" class="rn-pkg" data-pkg="${p}"><b>${p}</b><small>&nbsp;</small></button>`).join("")}</div>
        </div>

        <div class="rn-block">
            <label class="rn-label" for="noHari">${escapeHtml(t("rn_days_label"))}</label>
            <div class="rn-days"><input type="number" id="noHari" min="1" max="365" inputmode="numeric" value="${st.hari}"><span>${escapeHtml(t("rn_days_unit"))}</span></div>
            <div class="rn-hint">${escapeHtml(t("rn_days_hint"))}</div>
            <div class="rn-chips" id="noChips">${RN_QUICK.map(n => `<button type="button" class="rn-chip" data-n="${n}">${n}</button>`).join("")}</div>
        </div>

        <div class="rn-block">
            <label class="rn-label" for="noTag">${escapeHtml(t("rn_tag_label"))}</label>
            <div class="rn-tagbox"><input type="text" id="noTag" maxlength="100" placeholder="${escapeHtml(t("no_tag_ph"))}" autocomplete="off"></div>
        </div>

        <div class="rn-info">ℹ️ ${escapeHtml(t("no_info"))}</div>
        <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="noNo">${escapeHtml(t("rn_cancel"))}</button>
            <button type="button" class="btn btn-gold" id="noYes">${escapeHtml(t("no_send"))}</button>
        </div>`;
    $("modalOverlay").classList.add("show");

    const sync = () => {
        $("noChips").querySelectorAll(".rn-chip").forEach(c => c.classList.toggle("on", Number(c.dataset.n) === Number($("noHari").value)));
        $("noPkgs").querySelectorAll(".rn-pkg").forEach(c => c.classList.toggle("on", c.dataset.pkg === st.pkg));
    };
    $("noHari").addEventListener("input", sync);
    $("noChips").addEventListener("click", (e) => { const c = e.target.closest(".rn-chip"); if (c) { $("noHari").value = c.dataset.n; sync(); } });
    $("noPkgs").addEventListener("click", (e) => { const c = e.target.closest(".rn-pkg"); if (c) { st.pkg = c.dataset.pkg; sync(); } });
    $("noNo").addEventListener("click", closeModal);
    sync();

    $("noYes").addEventListener("click", async () => {
        const hari = parseInt($("noHari").value, 10), tag = $("noTag").value.trim();
        if (!hari || hari < 1 || hari > 365) { showToast(t("rn_err_days"), "danger"); return; }
        if (!tag) { showToast(t("rn_err_tag"), "danger"); $("noTag").focus(); return; }

        const btn = $("noYes"); btn.disabled = true; btn.textContent = t("rn_sending");
        const { data, error } = await cuRpc("cu_request_new_order", { p_dashboard: st.pkg, p_hari: hari, p_tagar: tag });
        if (error) {
            btn.disabled = false; btn.textContent = t("no_send");
            const m = error.message || "";
            showToast(/does not exist|schema cache/i.test(m) ? t("rn_err_not_ready") : (translateServerError(m) || t("rn_err_generic")), "danger");
            return;
        }
        await loadRenewals();
        showRenewSent({ id: data && data.id, tagar: tag, pkg: st.pkg, hari, isNew: true });
    });
}

document.addEventListener("click", (e) => { if (e.target.closest("[data-new-order]")) openNewOrderModal(); });
