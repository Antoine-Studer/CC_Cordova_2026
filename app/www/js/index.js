document.addEventListener('deviceready', onDeviceReady, false);
// Fallback for browser when cordova isn't present
document.addEventListener('DOMContentLoaded', function() {
    if (typeof cordova === 'undefined') {
        onDeviceReady();
    }
});

let expenses = [];

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
    if (btnBack) btnBack.addEventListener('click', function() {
        // Retourne vers l'écran d'ajout
        window.location.href = 'index.html';
    });

    // Si on est sur list.html, rendre la liste
    if (document.getElementById('list')) {
        render();
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
            <div class="expense-item" style="border-bottom: 1px solid #ddd; padding: 10px;">
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
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            expenses = expenses.filter(e => e.id !== id);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            render();

            showToast('Dépense supprimée');
        });
    });
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, duration);
}