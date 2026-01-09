document.addEventListener('deviceready', onDeviceReady, false);
// Fallback for browser when cordova isn't present
document.addEventListener('DOMContentLoaded', function() {
    if (typeof cordova === 'undefined') {
        onDeviceReady();
    }
});

let expenses = [];
let editingId = null;

function onDeviceReady() {
    // Charger les données sauvegardées au démarrage
    const saved = localStorage.getItem('expenses');
    if (saved) {
        try {
            expenses = JSON.parse(saved) || [];
        } catch (e) {
            expenses = [];
        }
    }

    // Attacher handlers si les éléments existent sur la page
    const btnAdd = document.getElementById('btnAdd');
    if (btnAdd) btnAdd.addEventListener('click', addExpense);

    const btnList = document.getElementById('btnList');
    if (btnList) btnList.addEventListener('click', function() {
        // Navigue vers list.html
        window.location.href = 'list.html';
    });

    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        // Comportement du bouton Back selon l'écran
        if (document.getElementById('category-totals')) {
            btnBack.addEventListener('click', function() {
                window.location.href = 'list.html';
            });
        } else if (document.getElementById('list')) {
            btnBack.addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        } else {
            // Par défaut retourne à index
            btnBack.addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        }
    }

    const btnTotalByCat = document.getElementById('btnTotalByCat');
    if (btnTotalByCat) {
        btnTotalByCat.addEventListener('click', function() {
            window.location.href = 'total_by_cat.html';
        });
    }

    // Si on a un paramètre edit dans l'URL, préremplir le formulaire
    try {
        const params = new URLSearchParams(window.location.search);
        const editParam = params.get('edit');
        if (editParam) {
            const id = parseInt(editParam, 10);
            if (!isNaN(id)) {
                populateFormForEdit(id);
            }
        }
    } catch (e) {
        // ignore
    }

    // Si on est sur list.html, rendre la liste
    if (document.getElementById('list')) {
        render();
    }

    // Si on est sur la page totals par catégorie, afficher les totaux
    if (document.getElementById('category-totals')) {
        renderCategoryTotals();
    }
}

function addExpense() {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('desc');
    const catInput = document.getElementById('cat');
    const dateInput = document.getElementById('date');

    const amount = parseFloat(amountInput.value);
    const desc = descInput.value;
    const cat = catInput ? catInput.value : '';
    const dateVal = dateInput ? dateInput.value : '';

    if (!amount || !desc) {
        alert("Veuillez remplir le montant et la description");
        return;
    }

    if (editingId) {
        // Modifier une dépense existante
        const idx = expenses.findIndex(e => e.id === editingId);
        if (idx !== -1) {
            expenses[idx].amount = amount;
            expenses[idx].desc = desc;
            expenses[idx].cat = cat;
            expenses[idx].date = dateVal;
            localStorage.setItem('expenses', JSON.stringify(expenses));

            // Réinitialiser l'état d'édition
            editingId = null;
            const btnAdd = document.getElementById('btnAdd');
            if (btnAdd) btnAdd.textContent = 'Enregistrer';
            const btnCancel = document.getElementById('btnCancel');
            if (btnCancel) btnCancel.style.display = 'none';

            render();
            showToast('Dépense modifiée');

            // Nettoyage des champs
            amountInput.value = "";
            descInput.value = "";
            if (dateInput) dateInput.value = "";

            // Enlever le paramètre edit de l'URL sans recharger
            try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
            return;
        }
    }

    // Ajout à la liste
    expenses.push({ 
        id: Date.now(), // ID unique pour la future suppression
        amount, 
        desc, 
        cat,
        date: dateVal // stocke la chaîne telle quelle
    });

    // Sauvegarde locale
    localStorage.setItem('expenses', JSON.stringify(expenses));

    // Nettoyage des champs
    amountInput.value = "";
    descInput.value = "";
    if (dateInput) dateInput.value = "";

    render();

    // Toaster
    showToast('Dépense ajoutée');
}

function render() {
    const listDiv = document.getElementById('list');
    const totalSpan = document.getElementById('total');
    if (!listDiv || !totalSpan) return;

    let html = "";
    let total = 0;

    expenses.forEach(ex => {
        const dateStr = ex.date ? new Date(ex.date).toLocaleString() : '';
        html += `
            <div class="expense-item expense-entry" data-id="${ex.id}" style="border-bottom: 1px solid #ddd; padding: 10px; cursor: pointer;">
                <b>${ex.desc}</b> - ${ex.cat} <small style="color:#666;">${dateStr}</small><br>
                <span style="color: #e91e63;">${ex.amount.toFixed(2)} €</span>
                <button data-id="${ex.id}" class="btnDel" style="float:right;">Supprimer</button>
            </div>`;
        total += ex.amount;
    });

    listDiv.innerHTML = html;
    totalSpan.innerText = total.toFixed(2);

    // Attacher les handlers de suppression
    const dels = document.querySelectorAll('.btnDel');
    dels.forEach(btn => {
        btn.addEventListener('click', function(event) {
            // Empêcher la propagation pour que le clic sur supprimer n'active pas l'édition
            if (event && event.stopPropagation) event.stopPropagation();
            const id = parseInt(this.getAttribute('data-id'));
            expenses = expenses.filter(e => e.id !== id);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            render();

            showToast('Dépense supprimée');
        });
    });

    // Attacher les handlers d'édition (clic sur l'élément)
    const entries = document.querySelectorAll('.expense-entry');
    entries.forEach(el => {
        el.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            // Naviguer vers index.html en mode édition
            window.location.href = 'index.html?edit=' + id;
        });
    });
}

function renderCategoryTotals() {
    const container = document.getElementById('category-totals');
    if (!container) return;

    // Calculer les totaux par catégorie
    const totals = expenses.reduce((acc, ex) => {
        const key = ex.cat || 'Non catégorisé';
        if (!acc[key]) acc[key] = { total: 0, count: 0 };
        acc[key].total += Number(ex.amount) || 0;
        acc[key].count += 1;
        return acc;
    }, {});

    // Transformer en tableau trié par total décroissant
    const rows = Object.keys(totals).map(cat => ({
        category: cat,
        total: totals[cat].total,
        count: totals[cat].count
    })).sort((a, b) => b.total - a.total);

    // Générer le HTML
    let html = '<div class="category-list">';
    if (rows.length === 0) {
        html += '<p>Aucune dépense enregistrée.</p>';
    } else {
        rows.forEach(r => {
            html += `<div class="category-row" style="padding:8px 0;border-bottom:1px solid #eee;">
                        <strong>${r.category}</strong>
                        <div style="float:right;color:#e91e63;">${r.total.toFixed(2)} €</div>
                        <div style="clear:both;color:#666;">${r.count} dépense(s)</div>
                     </div>`;
        });
    }
    html += '</div>';

    container.innerHTML = html;
}

function populateFormForEdit(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('desc');
    const catInput = document.getElementById('cat');
    const dateInput = document.getElementById('date');

    if (amountInput) amountInput.value = exp.amount;
    if (descInput) descInput.value = exp.desc;

    if (catInput) {
        // si l'option n'existe pas, essayer de l'ajouter
        let optionExists = Array.from(catInput.options).some(o => o.value === exp.cat);
        if (!optionExists && exp.cat) {
            const opt = document.createElement('option');
            opt.value = exp.cat;
            opt.textContent = exp.cat;
            catInput.appendChild(opt);
        }
        catInput.value = exp.cat || '';
    }

    if (dateInput) dateInput.value = exp.date || '';

    editingId = id;
    const btnAdd = document.getElementById('btnAdd');
    if (btnAdd) btnAdd.textContent = 'Modifier';
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) btnCancel.style.display = 'inline-block';
}

function cancelEdit() {
    editingId = null;
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('desc');
    const dateInput = document.getElementById('date');
    if (amountInput) amountInput.value = '';
    if (descInput) descInput.value = '';
    if (dateInput) dateInput.value = '';
    const btnAdd = document.getElementById('btnAdd');
    if (btnAdd) btnAdd.textContent = 'Enregistrer';
    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) btnCancel.style.display = 'none';
    try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, duration);
}