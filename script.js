document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentDate = new Date();
    let incomeCaio = 0;
    let incomeKamilla = 0;
    let expenses = [];
    let monthlyIncomeData = {}; // Stores income per month: { '2026-02': { caio: X, kamilla: Y } }
    let currentFilter = 'all';

    // DOM Elements
    const incomeInputCaio = document.getElementById('income-caio');
    const incomeInputKamilla = document.getElementById('income-kamilla');

    const totalExpensesEl = document.getElementById('total-expenses');
    const expenseCaioEl = document.getElementById('expense-caio');
    const expenseKamillaEl = document.getElementById('expense-kamilla');

    // New Cards
    const totalDebitEl = document.getElementById('total-debit');
    const totalCreditEl = document.getElementById('total-credit');

    const balanceCaioEl = document.getElementById('balance-caio');
    const balanceKamillaEl = document.getElementById('balance-kamilla');
    const balanceTotalEl = document.getElementById('balance-total');

    const expenseForm = document.getElementById('expense-form');
    const transactionsList = document.getElementById('transactions-list');
    const emptyState = document.getElementById('empty-state');
    const filterTabs = document.getElementById('filter-tabs');

    const splitExpenseCheckbox = document.getElementById('split-expense');
    const ownerSelectionDiv = document.getElementById('owner-selection');

    // Month Navigation Elements
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const currentMonthDisplay = document.getElementById('current-month-display');

    // Helpers
    const getMonthKey = (date) => {
        return date.toISOString().slice(0, 7); // Returns "YYYY-MM"
    };

    const formatMonthDisplay = (date) => {
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    // Load Data from LocalStorage
    const loadData = () => {
        // Migration: Load old simple income if exists and no monthly data
        const storedIncomeCaio = localStorage.getItem('fin_income_caio');
        const storedIncomeKamilla = localStorage.getItem('fin_income_kamilla');

        const storedMonthlyIncome = localStorage.getItem('fin_monthly_income');
        const storedExpenses = localStorage.getItem('fin_expenses');

        if (storedMonthlyIncome) {
            monthlyIncomeData = JSON.parse(storedMonthlyIncome);
        } else if (storedIncomeCaio || storedIncomeKamilla) {
            // Migrating old single-value income to current month
            const currentKey = getMonthKey(currentDate);
            monthlyIncomeData[currentKey] = {
                caio: parseFloat(storedIncomeCaio) || 0,
                kamilla: parseFloat(storedIncomeKamilla) || 0
            };
        }

        if (storedExpenses) expenses = JSON.parse(storedExpenses);

        updateMonthUI();
    };

    // Save Data
    const saveData = () => {
        localStorage.setItem('fin_monthly_income', JSON.stringify(monthlyIncomeData));
        localStorage.setItem('fin_expenses', JSON.stringify(expenses));
        // We don't save single 'fin_income_caio' anymore, but keep it for backward compat if needed
    };

    // Format Currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Format Date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // Toggle Owner Selection
    splitExpenseCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            ownerSelectionDiv.style.display = 'none';
        } else {
            ownerSelectionDiv.style.display = 'block';
        }
    });

    // Update UI based on Current Month
    const updateMonthUI = () => {
        const monthKey = getMonthKey(currentDate);

        // 1. Update Header Display
        currentMonthDisplay.textContent = formatMonthDisplay(currentDate);

        // 2. Load Income for this Month
        const monthIncome = monthlyIncomeData[monthKey] || { caio: 0, kamilla: 0 };
        incomeCaio = monthIncome.caio;
        incomeKamilla = monthIncome.kamilla;

        // Update Inputs
        incomeInputCaio.value = incomeCaio > 0 ? incomeCaio : '';
        incomeInputKamilla.value = incomeKamilla > 0 ? incomeKamilla : '';

        // 3. Filter Expenses for this Month
        // We filter by checking if the expense DATE string starts with "YYYY-MM"
        const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(monthKey));

        calculateTotals(monthlyExpenses);
    };

    // Calculate Totals & Balances
    const calculateTotals = (filteredExpenses) => {
        // Variables for "Gastos" Card (Includes EVERYTHING)
        let totalExpenses = 0;
        let displayExpensesCaio = 0;
        let displayExpensesKamilla = 0;

        let totalDebit = 0;
        let totalCredit = 0;

        // Variables for "Saldos" Card (Only Fixed OR Credit)
        let deductibleCaio = 0;
        let deductibleKamilla = 0;

        filteredExpenses.forEach(exp => {
            // 1. Calculate Grand Totals for "Gastos" Card
            totalExpenses += exp.amount;

            // Calculate Debit/Credit Totals
            if (exp.payment === 'credito') {
                totalCredit += exp.amount;
            } else {
                totalDebit += exp.amount;
            }

            let amountCaio = 0;
            let amountKamilla = 0;

            if (exp.isSplit) {
                amountCaio = exp.amount / 2;
                amountKamilla = exp.amount / 2;
            } else {
                if (exp.owner === 'Caio') amountCaio = exp.amount;
                if (exp.owner === 'Kamilla') amountKamilla = exp.amount;
            }

            displayExpensesCaio += amountCaio;
            displayExpensesKamilla += amountKamilla;

            // 2. Calculate Deductibles for "Saldos" Card
            // Condition: Category is 'fixa' OR Payment is 'credito'
            if (exp.category === 'fixa' || exp.payment === 'credito') {
                deductibleCaio += amountCaio;
                deductibleKamilla += amountKamilla;
            }
        });

        // Calculate Balances
        const balanceCaio = incomeCaio - deductibleCaio;
        const balanceKamilla = incomeKamilla - deductibleKamilla;
        const totalBalance = balanceCaio + balanceKamilla;

        // Update Dashboard Display

        // Expense Card shows EVERYTHING
        totalExpensesEl.textContent = formatCurrency(totalExpenses);
        expenseCaioEl.textContent = formatCurrency(displayExpensesCaio);
        expenseKamillaEl.textContent = formatCurrency(displayExpensesKamilla);

        // New Cards: Debit & Credit
        totalDebitEl.textContent = formatCurrency(totalDebit);
        totalCreditEl.textContent = formatCurrency(totalCredit);

        // Balance Card shows filtered result
        balanceCaioEl.textContent = formatCurrency(balanceCaio);
        balanceKamillaEl.textContent = formatCurrency(balanceKamilla);
        balanceTotalEl.textContent = formatCurrency(totalBalance);

        // Color Coding Balances
        const setBalanceColor = (el, val) => {
            if (val >= 0) el.style.color = 'var(--color-income)';
            else el.style.color = 'var(--color-expense)';
        };

        setBalanceColor(balanceCaioEl, balanceCaio);
        setBalanceColor(balanceKamillaEl, balanceKamilla);
        setBalanceColor(balanceTotalEl, totalBalance);

        renderTransactions(filteredExpenses);
    };

    // Render Transactions List
    const renderTransactions = (expensesToRender) => {
        transactionsList.innerHTML = '';

        let filtered = expensesToRender;

        if (currentFilter !== 'all') {
            if (currentFilter.startsWith('owner:')) {
                // Filter by Owner
                const ownerName = currentFilter.split(':')[1];
                filtered = expensesToRender.filter(exp => {
                    // Include if 'isSplit' is true (belongs to both) OR if owner matches
                    return exp.isSplit || exp.owner === ownerName;
                });
            } else {
                // Filter by Category
                filtered = expensesToRender.filter(exp => exp.category === currentFilter);
            }
        }

        // Sort by date (closests first)
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            filtered.forEach(exp => {
                const li = document.createElement('li');
                li.className = `transaction-item cat-${exp.category}`;

                // Determine values for display
                let valCaio = 0;
                let valKamilla = 0;

                if (exp.isSplit) {
                    valCaio = exp.amount / 2;
                    valKamilla = exp.amount / 2;
                } else {
                    if (exp.owner === 'Caio') valCaio = exp.amount;
                    if (exp.owner === 'Kamilla') valKamilla = exp.amount;
                }

                // Helper to format/style value
                const renderVal = (val, owner) => {
                    const formatted = formatCurrency(val);
                    const colorClass = val > 0 ? `val-${owner.toLowerCase()}` : 'val-zero';
                    return `<span class="t-split-col ${owner.toLowerCase()}-col ${colorClass}" data-label="${owner}">${val > 0 ? formatted : '-'}</span>`;
                };

                // Payment Method Badge
                const paymentLabel = exp.payment === 'credito' ? 'Crédito' : 'Débito';
                const paymentIcon = exp.payment === 'credito' ? 'fa-credit-card' : 'fa-money-bill-1';

                li.innerHTML = `
                    <div class="t-info">
                        <span class="t-name">${exp.desc} <span class="t-payment-icon" title="${paymentLabel}"><i class="fa-solid ${paymentIcon}"></i></span></span>
                        <div class="t-details-row">
                             <span class="t-category">${exp.category.toUpperCase()}</span>
                             <span class="t-date"><i class="fa-regular fa-clock"></i> ${formatDate(exp.date)}</span>
                        </div>
                    </div>
                    
                    ${renderVal(valCaio, 'Caio')}
                    ${renderVal(valKamilla, 'Kamilla')}
                    
                    <div class="t-actions">
                        <button class="delete-btn" onclick="deleteExpense(${exp.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                transactionsList.appendChild(li);
            });
        }
    };

    // Event Listeners: Income Changes
    const updateIncome = (key, value) => {
        const monthKey = getMonthKey(currentDate);
        if (!monthlyIncomeData[monthKey]) monthlyIncomeData[monthKey] = { caio: 0, kamilla: 0 };

        monthlyIncomeData[monthKey][key] = value;
        saveData();
        updateMonthUI();
    };

    incomeInputCaio.addEventListener('input', (e) => {
        updateIncome('caio', parseFloat(e.target.value) || 0);
    });

    incomeInputKamilla.addEventListener('input', (e) => {
        updateIncome('kamilla', parseFloat(e.target.value) || 0);
    });

    // Event Listeners: Month Navigation
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateMonthUI();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateMonthUI();
    });

    // Event Listener: Add Expense
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const desc = document.getElementById('desc').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const category = document.querySelector('input[name="category"]:checked').value;
        const payment = document.querySelector('input[name="payment"]:checked').value;
        const isSplit = splitExpenseCheckbox.checked;

        let owner = null;
        if (!isSplit) {
            const ownerInput = document.querySelector('input[name="owner"]:checked');
            if (ownerInput) {
                owner = ownerInput.value;
            } else {
                alert('Por favor, selecione quem paga a conta (Caio ou Kamilla).');
                return;
            }
        }

        if (desc && amount && date) {
            const newExpense = {
                id: Date.now(),
                desc,
                amount,
                date,
                category,
                payment,
                isSplit,
                owner
            };

            expenses.push(newExpense);
            saveData();
            updateMonthUI(); // Refresh UI

            // Reset Form 
            expenseForm.reset();
            // Restore default states
            document.getElementById('cat-fixa').checked = true;
            document.getElementById('pay-debit').checked = true;
            splitExpenseCheckbox.checked = true;
            ownerSelectionDiv.style.display = 'none';
        }
    });

    // Event Listener: Filters
    filterTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            currentFilter = e.target.dataset.filter;
            updateMonthUI(); // Need to re-trigger calculation/rendering
        }
    });

    // Global Delete
    window.deleteExpense = (id) => {
        if (confirm('Tem certeza que deseja apagar este gasto?')) {
            expenses = expenses.filter(exp => exp.id !== id);
            saveData();
            updateMonthUI();
        }
    };

    // Login Logic
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginPasswordInput = document.getElementById('login-password');
    const userAvatar = document.getElementById('user-avatar');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = loginPasswordInput.value;

        // Simple hardcoded password for now
        if (password === '1234') {
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'block';
                // Trigger a UI update to ensure charts/tables render correctly if needed
                updateMonthUI();
            }, 300); // Wait for fade out
        } else {
            alert('Senha incorreta! Tente novamente.');
            loginPasswordInput.value = '';
            loginPasswordInput.focus();
        }
    });

    // Profile Dropdown Toggle
    userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Logout Action
    logoutBtn.addEventListener('click', () => {
        // Hide App
        appContainer.style.display = 'none';

        // Show Login Screen
        loginScreen.style.display = 'flex';
        setTimeout(() => {
            loginScreen.style.opacity = '1';
        }, 10);

        // Reset State
        loginPasswordInput.value = '';
        userDropdown.classList.remove('active');
    });

    // Print Report
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // --- PWA INSTALLATION LOGIC ---
    let deferredPrompt;
    const installBtn = document.getElementById('install-app-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        installBtn.style.display = 'flex';
    });

    installBtn.addEventListener('click', (e) => {
        // Hide our user interface that shows our A2HS button
        installBtn.style.display = 'none';
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            } else {
                console.log('User dismissed the A2HS prompt');
            }
            deferredPrompt = null;
        });
    });

    // --- DATA BACKUP & RESTORE ---
    const backupBtn = document.getElementById('backup-btn');
    const restoreFile = document.getElementById('restore-file');

    backupBtn.addEventListener('click', () => {
        const data = {
            monthlyIncomeData,
            expenses
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "financeiro_backup_" + new Date().toISOString().slice(0, 10) + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert('Backup realizado com sucesso! O arquivo foi baixado.');
    });

    restoreFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.monthlyIncomeData && data.expenses) {
                    if (confirm('Isso irá substituir TODOS os dados atuais pelos do backup. Deseja continuar?')) {
                        localStorage.setItem('fin_monthly_income', JSON.stringify(data.monthlyIncomeData));
                        localStorage.setItem('fin_expenses', JSON.stringify(data.expenses));
                        alert('Dados restaurados com sucesso! A página será recarregada.');
                        location.reload();
                    }
                } else {
                    alert('Arquivo de backup inválido.');
                }
            } catch (err) {
                alert('Erro ao ler o arquivo de backup.');
                console.error(err);
            }
        };
        reader.readAsText(file);
    });

    // Initialize
    loadData();
});
