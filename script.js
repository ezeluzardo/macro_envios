// Configuración global
const CONFIG = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.ejemplo.com/pedidos',
    colectaTime: localStorage.getItem('colectaTime') || '16:00',
    refreshInterval: 5 * 60 * 1000, // 5 minutos
    autoRefreshEnabled: true
};

// Estado global de la aplicación
let orders = [];
let filteredOrders = [];
let refreshTimer = null;
let nextRefreshTime = null;
let currentAssignOrderId = null;
let currentUser = null;

// Sistema de usuarios y autenticación
const DEMO_USERS = {
    'admin': {
        password: 'admin123',
        name: 'Administrador',
        role: 'supervisor',
        permissions: ['view_all', 'assign_orders', 'print_orders', 'view_history', 'manage_notes']
    },
    'operador1': {
        password: 'op123',
        name: 'Operador 1',
        role: 'operador',
        permissions: ['view_orders', 'assign_orders', 'print_orders', 'add_notes']
    },
    'operador2': {
        password: 'op123',
        name: 'Operador 2',
        role: 'operador',
        permissions: ['view_orders', 'assign_orders', 'print_orders', 'add_notes']
    }
};

// Funciones de autenticación
function authenticateUser(username, password) {
    const user = DEMO_USERS[username];
    if (user && user.password === password) {
        return {
            username: username,
            name: user.name,
            role: user.role,
            permissions: user.permissions
        };
    }
    return null;
}

function saveUserSession(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    currentUser = user;
}

function loadUserSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return currentUser;
    }
    return null;
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    updateUserInfo();
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('currentUserName').textContent = currentUser.name;
        document.getElementById('currentUserRole').textContent = currentUser.role;
        
        // Controlar visibilidad de elementos según permisos
        const settingsBtn = document.getElementById('settingsBtn');
        const historyBtn = document.getElementById('historyBtn');
        
        // Solo el admin puede ver el botón de configuraciones
        if (hasPermission('view_all')) {
            settingsBtn.style.display = 'flex';
        } else {
            settingsBtn.style.display = 'none';
        }
        
        // Solo usuarios con permisos de historial pueden verlo
        if (hasPermission('view_history')) {
            historyBtn.style.display = 'flex';
        } else {
            historyBtn.style.display = 'none';
        }
    }
}

function hasPermission(permission) {
    return currentUser && currentUser.permissions.includes(permission);
}

// Sistema de historial y auditoría
function addToHistory(action, orderId, details = {}) {
    if (!currentUser) return;
    
    const historyItem = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        action: action,
        orderId: orderId,
        user: currentUser.username,
        userName: currentUser.name,
        details: details
    };
    
    let history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    history.unshift(historyItem); // Agregar al inicio
    
    // Mantener solo los últimos 1000 registros
    if (history.length > 1000) {
        history = history.slice(0, 1000);
    }
    
    localStorage.setItem('orderHistory', JSON.stringify(history));
}

function getOrderHistory(filters = {}) {
    const history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    
    let filteredHistory = history;
    
    // Filtrar por fecha
    if (filters.date) {
        const filterDate = new Date(filters.date).toDateString();
        filteredHistory = filteredHistory.filter(item => 
            new Date(item.timestamp).toDateString() === filterDate
        );
    }
    
    // Filtrar por usuario
    if (filters.user) {
        filteredHistory = filteredHistory.filter(item => 
            item.user === filters.user
        );
    }
    
    // Filtrar por acción
    if (filters.action) {
        filteredHistory = filteredHistory.filter(item => 
            item.action === filters.action
        );
    }
    
    return filteredHistory;
}

function getActionIcon(action) {
    const icons = {
        'created': 'fas fa-plus-circle',
        'assigned': 'fas fa-user-check',
        'printed': 'fas fa-print',
        'sent': 'fas fa-paper-plane',
        'note_added': 'fas fa-sticky-note',
        'config_changed': 'fas fa-cogs'
    };
    return icons[action] || 'fas fa-circle';
}

function getActionText(action) {
    const texts = {
        'created': 'Pedido creado',
        'assigned': 'Pedido asignado',
        'printed': 'Pedido impreso',
        'sent': 'Pedido marcado como enviado',
        'note_added': 'Nota agregada',
        'config_changed': 'Configuración del sistema modificada'
    };
    return texts[action] || action;
}

// Sistema de notas
function addOrderNote(orderId, noteText) {
    if (!currentUser || !noteText.trim()) return false;
    
    const note = {
        id: Date.now() + Math.random(),
        orderId: orderId,
        text: noteText.trim(),
        author: currentUser.username,
        authorName: currentUser.name,
        timestamp: new Date().toISOString()
    };
    
    let notes = JSON.parse(localStorage.getItem('orderNotes') || '[]');
    notes.unshift(note);
    
    localStorage.setItem('orderNotes', JSON.stringify(notes));
    
    // Agregar al historial
    addToHistory('note_added', orderId, {
        noteText: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : '')
    });
    
    return true;
}

function getOrderNotes(orderId) {
    const notes = JSON.parse(localStorage.getItem('orderNotes') || '[]');
    return notes.filter(note => note.orderId === orderId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getAllUsers() {
    return Object.keys(DEMO_USERS);
}

// Elementos del DOM actualizados
const elements = {
    ordersGrid: document.getElementById('ordersGrid'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    noOrders: document.getElementById('noOrders'),
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    typeFilter: document.getElementById('typeFilter'),
    statusFilter: document.getElementById('statusFilter'),
    searchInput: document.getElementById('searchInput'),
    assignModal: document.getElementById('assignModal'),
    settingsModal: document.getElementById('settingsModal'),
    assignForm: document.getElementById('assignForm'),
    settingsForm: document.getElementById('settingsForm'),
    assignOrderInfo: document.getElementById('assignOrderInfo'),
    nextRefresh: document.getElementById('nextRefresh'),
    // Contadores del dashboard
    pendingCount: document.getElementById('pendingCount'),
    takenCount: document.getElementById('takenCount'),
    sentCount: document.getElementById('sentCount'),
    urgentCount: document.getElementById('urgentCount'),
    // Tabs de navegación
    tabBtns: document.querySelectorAll('.tab-btn')
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Verificar si hay una sesión activa
    const savedUser = loadUserSession();
    if (savedUser) {
        showMainApp();
        loadSettings();
        setupEventListeners();
        setupModalEvents();
        loadOrders();
        startAutoRefresh();
    } else {
        showLoginScreen();
        setupLoginEvents();
    }
}

// Event listeners para login
function setupLoginEvents() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const user = authenticateUser(username, password);
    
    if (user) {
        saveUserSession(user);
        showMainApp();
        loadSettings();
        setupEventListeners();
        setupModalEvents();
        loadOrders();
        startAutoRefresh();
        showNotification(`Bienvenido, ${user.name}!`, 'success');
    } else {
        showNotification('Usuario o contraseña incorrectos', 'error');
    }
}

function setupEventListeners() {
    // Botones principales
    elements.refreshBtn.addEventListener('click', () => {
        resetAutoRefresh();
        loadOrders();
    });
    
    elements.settingsBtn.addEventListener('click', () => {
        if (!hasPermission('view_all')) {
            showNotification('Solo el administrador puede acceder a la configuración', 'error');
            return;
        }
        openSettingsModal();
    });
    
    // Nuevos botones de seguridad
    document.getElementById('historyBtn').addEventListener('click', openHistoryModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Filtros y búsqueda
    elements.searchInput.addEventListener('input', applyFilters);
    elements.typeFilter.addEventListener('change', applyFilters);
    elements.statusFilter.addEventListener('change', applyFilters);
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });
    
    // Configuración
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    
    // Asignación de pedidos
    document.getElementById('assignOrder').addEventListener('click', handleAssignOrder);
    
    // Historial
    document.getElementById('historyDateFilter').addEventListener('change', filterHistory);
    document.getElementById('historyUserFilter').addEventListener('change', filterHistory);
    document.getElementById('historyActionFilter').addEventListener('change', filterHistory);
    
    // Notas
    document.getElementById('addNoteForm').addEventListener('submit', handleAddNote);
    document.getElementById('cancelNote').addEventListener('click', closeNotesModal);
}

function setupModalEvents() {
    // Usar delegación de eventos para todos los botones de cerrar
    document.addEventListener('click', (e) => {
        // Cerrar modal con botón X
        if (e.target.classList.contains('close-btn') || e.target.closest('.close-btn')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                // Limpiar formularios si es necesario
                if (modal.id === 'notesModal') {
                    document.getElementById('noteText').value = '';
                }
                if (modal.id === 'assignModal') {
                    currentAssignOrderId = null;
                }
            }
        }
        
        // Cerrar modal al hacer clic fuera
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            // Limpiar formularios si es necesario
            if (e.target.id === 'notesModal') {
                document.getElementById('noteText').value = '';
            }
            if (e.target.id === 'assignModal') {
                currentAssignOrderId = null;
            }
        }
        
        // Botones de cancelar específicos
        if (e.target.id === 'cancelAssign') {
            document.getElementById('assignModal').style.display = 'none';
            currentAssignOrderId = null;
        }
        
        if (e.target.id === 'cancelSettings') {
            document.getElementById('settingsModal').style.display = 'none';
        }
        
        if (e.target.id === 'cancelNote') {
            closeNotesModal();
        }
    });
    
    // Cerrar modales con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="flex"], .modal[style*="block"]');
            openModals.forEach(modal => {
                modal.style.display = 'none';
                // Limpiar formularios si es necesario
                if (modal.id === 'notesModal') {
                    document.getElementById('noteText').value = '';
                }
                if (modal.id === 'assignModal') {
                    currentAssignOrderId = null;
                }
            });
        }
    });
}

// Gestión de datos
async function loadOrders() {
    showLoading(true);
    
    try {
        // Simulación de datos para demostración
        // En producción, reemplazar con: const response = await fetch(CONFIG.apiUrl);
        const mockData = generateMockOrders();
        
        // const response = await fetch(CONFIG.apiUrl);
        // if (!response.ok) throw new Error('Error al cargar pedidos');
        // orders = await response.json();
        
        orders = mockData;
        applyFilters();
        showLoading(false);
        
        console.log(`Cargados ${orders.length} pedidos`);
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        showError('Error al cargar los pedidos. Verifique la conexión a la API.');
        showLoading(false);
    }
}

function generateMockOrders() {
    const types = ['FLEX ML', 'FLEX MT', 'COLECTA ML', 'DAC', 'PEDIDOS YA'];
    const statuses = ['Pendiente', 'Tomado', 'Enviado'];
    const users = ['Juan Pérez', 'María García', 'Carlos López', null, null, null];
    
    const mockOrders = [];
    
    for (let i = 1; i <= 15; i++) {
        const creationTime = new Date();
        creationTime.setHours(creationTime.getHours() - Math.random() * 8);
        
        const type = types[Math.floor(Math.random() * types.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const assignedUser = status === 'Tomado' || status === 'Enviado' ? 
            users[Math.floor(Math.random() * 3)] : null;
        
        mockOrders.push({
            id: `ORD-${String(i).padStart(4, '0')}`,
            type: type,
            creationTime: creationTime.toISOString(),
            status: status,
            assignedUser: assignedUser,
            customer: `Cliente ${i}`,
            address: `Dirección ${i}, Ciudad`,
            notes: `Notas del pedido ${i}`
        });
    }
    
    return mockOrders;
}

// Lógica de negocio mejorada con horarios de trabajo
function calculateDeadline(order) {
    const creationDate = new Date(order.creationTime);
    const creationHour = creationDate.getHours();
    const dayOfWeek = creationDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    
    // Verificar si es día laborable
    if (dayOfWeek === 0) { // Domingo
        return 'No laborable';
    }
    
    // Lógica para sábados (solo FLEX ML y FLEX MT)
    if (dayOfWeek === 6) { // Sábado
        if (order.type === 'FLEX ML' || order.type === 'FLEX MT') {
            // Sábados: trabajo de 10:00 a 14:00, envíos hasta 12:00
            if (creationHour < 10) {
                return '12:00'; // Si se crea antes de las 10, se envía a las 12
            } else if (creationHour >= 10 && creationHour < 12) {
                return '12:00'; // Último envío del sábado
            } else {
                return 'Fuera de horario'; // Después de las 12 no hay envíos
            }
        } else {
            return 'No disponible sábados'; // Otros tipos no se procesan sábados
        }
    }
    
    // Lógica para lunes a viernes (10:00 a 19:00)
    switch (order.type) {
        case 'FLEX ML':
        case 'FLEX MT':
            // Verificar horario laboral
            if (creationHour < 10) {
                return '12:00'; // Si se crea antes de las 10, primer envío del día
            } else if (creationHour < 12) {
                return '12:00';
            } else if (creationHour < 17) {
                return '17:00';
            } else if (creationHour < 19) {
                return 'Próximo día hábil';
            } else {
                return 'Próximo día hábil';
            }
            
        case 'COLECTA ML':
            if (creationHour >= 19) {
                return 'Próximo día hábil';
            }
            return CONFIG.colectaTime;
            
        case 'DAC':
            if (creationHour >= 18) {
                return 'Próximo día hábil';
            }
            return '18:00';
            
        case 'PEDIDOS YA':
            const deadline = new Date(creationDate);
            deadline.setHours(deadline.getHours() + 2);
            
            // Verificar si el deadline cae fuera del horario laboral
            const deadlineHour = deadline.getHours();
            if (deadlineHour >= 19) {
                return 'Próximo día hábil';
            }
            
            return deadline.toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
        default:
            return '--:--';
    }
}

function isOrderUrgent(order) {
    const now = new Date();
    const deadline = calculateDeadline(order);
    
    // Si no tiene horario válido, no es urgente
    if (deadline === '--:--' || 
        deadline === 'No laborable' || 
        deadline === 'Fuera de horario' || 
        deadline === 'No disponible sábados' ||
        deadline === 'Próximo día hábil') {
        return false;
    }
    
    // Verificar si contiene solo hora (formato HH:MM)
    if (!deadline.includes(':')) {
        return false;
    }
    
    const [hours, minutes] = deadline.split(':').map(Number);
    const deadlineTime = new Date(now);
    deadlineTime.setHours(hours, minutes, 0, 0);
    
    // Si la hora límite ya pasó, no es urgente (será para el próximo día)
    if (deadlineTime < now) {
        return false;
    }
    
    const timeDiff = deadlineTime - now;
    const hoursUntilDeadline = timeDiff / (1000 * 60 * 60);
    
    // Urgente si queda 1 hora o menos y estamos en horario laboral
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Verificar si estamos en horario laboral
    const isWorkingHours = (dayOfWeek >= 1 && dayOfWeek <= 5 && currentHour >= 10 && currentHour < 19) ||
                          (dayOfWeek === 6 && currentHour >= 10 && currentHour < 14);
    
    return hoursUntilDeadline <= 1 && isWorkingHours;
}

// Renderizado mejorado con organización por horarios
function renderOrders() {
    if (filteredOrders.length === 0) {
        elements.ordersGrid.style.display = 'none';
        elements.noOrders.style.display = 'block';
        return;
    }
    
    elements.ordersGrid.style.display = 'block';
    elements.noOrders.style.display = 'none';
    
    // Agrupar por ventanas horarias
    const timeGroups = groupOrdersByTimeWindows(filteredOrders);
    
    elements.ordersGrid.innerHTML = '';
    
    // Ordenar grupos por hora (más urgente primero)
    const sortedGroups = Object.keys(timeGroups).sort((a, b) => {
        const timeA = parseTimeGroup(a);
        const timeB = parseTimeGroup(b);
        return timeA - timeB;
    });
    
    sortedGroups.forEach(groupKey => {
        const groupData = timeGroups[groupKey];
        const groupContainer = createTimeGroupContainer(groupKey, groupData);
        elements.ordersGrid.appendChild(groupContainer);
    });
}

// Nueva función para agrupar por ventanas horarias con horarios de trabajo
function groupOrdersByTimeWindows(orders) {
    const timeGroups = {};
    const now = new Date();
    
    orders.forEach(order => {
        const deadline = calculateDeadline(order);
        const isUrgent = isOrderUrgent(order);
        
        // Crear clave de grupo basada en la hora límite y horarios de trabajo
        let groupKey;
        let priority = 0;
        
        // Manejar casos especiales de horarios
        if (deadline === 'No laborable') {
            groupKey = '🚫 Domingo - No laborable';
            priority = 1000;
        } else if (deadline === 'Fuera de horario') {
            groupKey = '⏰ Fuera de horario laboral';
            priority = 900;
        } else if (deadline === 'No disponible sábados') {
            groupKey = '📅 No disponible sábados';
            priority = 800;
        } else if (deadline === 'Próximo día hábil') {
            groupKey = '📅 Próximo día hábil';
            priority = 700;
        } else if (deadline === '--:--') {
            groupKey = '❓ Sin horario definido';
            priority = 999;
        } else if (isUrgent) {
            groupKey = `🚨 URGENTE - Límite: ${deadline}`;
            priority = 0;
        } else {
            // Para horarios válidos (formato HH:MM)
            if (deadline.includes(':')) {
                const [hours, minutes] = deadline.split(':').map(Number);
                const deadlineTime = new Date(now);
                deadlineTime.setHours(hours, minutes, 0, 0);
                
                const dayOfWeek = now.getDay();
                const currentHour = now.getHours();
                
                // Determinar si es para hoy o mañana considerando horarios laborales
                if (deadlineTime < now) {
                    groupKey = `📅 Próximo día hábil - ${deadline}`;
                    priority = 100;
                } else {
                    const hoursUntil = Math.ceil((deadlineTime - now) / (1000 * 60 * 60));
                    
                    // Considerar si estamos en horario laboral
                    const isWorkingTime = (dayOfWeek >= 1 && dayOfWeek <= 5 && currentHour >= 10 && currentHour < 19) ||
                                         (dayOfWeek === 6 && currentHour >= 10 && currentHour < 14);
                    
                    if (hoursUntil <= 2 && isWorkingTime) {
                        groupKey = `⚡ Próximo - Límite: ${deadline}`;
                        priority = 1;
                    } else if (dayOfWeek === 6) {
                        groupKey = `📋 Sábado - Límite: ${deadline}`;
                        priority = 30;
                    } else {
                        groupKey = `📋 Hoy - Límite: ${deadline}`;
                        priority = 50;
                    }
                }
            } else {
                groupKey = `❓ ${deadline}`;
                priority = 500;
            }
        }
        
        if (!timeGroups[groupKey]) {
            timeGroups[groupKey] = {
                orders: [],
                priority: priority,
                deadline: deadline,
                isUrgent: isUrgent
            };
        }
        
        timeGroups[groupKey].orders.push(order);
    });
    
    // Ordenar pedidos dentro de cada grupo
    Object.keys(timeGroups).forEach(key => {
        timeGroups[key].orders.sort((a, b) => {
            // Primero por urgencia, luego por hora de creación
            const urgentA = isOrderUrgent(a) ? 0 : 1;
            const urgentB = isOrderUrgent(b) ? 0 : 1;
            
            if (urgentA !== urgentB) {
                return urgentA - urgentB;
            }
            
            return new Date(a.creationTime) - new Date(b.creationTime);
        });
    });
    
    return timeGroups;
}

// Función para parsear y ordenar grupos por tiempo con horarios de trabajo
function parseTimeGroup(groupKey) {
    if (groupKey.includes('URGENTE')) return 0;
    if (groupKey.includes('Próximo - Límite')) return 1;
    if (groupKey.includes('Sábado')) return 2;
    if (groupKey.includes('Hoy')) return 3;
    if (groupKey.includes('Próximo día hábil')) return 4;
    if (groupKey.includes('Fuera de horario')) return 5;
    if (groupKey.includes('No disponible sábados')) return 6;
    if (groupKey.includes('Domingo - No laborable')) return 7;
    if (groupKey.includes('Sin horario definido')) return 8;
    return 999;
}

// Crear contenedor de grupo de tiempo
function createTimeGroupContainer(groupKey, groupData) {
    const container = document.createElement('div');
    container.className = 'time-group';
    
    // Header del grupo
    const header = document.createElement('div');
    header.className = 'time-group-header';
    
    if (groupData.isUrgent) {
        header.classList.add('urgent');
    }
    
    const orderCount = groupData.orders.length;
    const pendingCount = groupData.orders.filter(o => o.status === 'Pendiente').length;
    
    header.innerHTML = `
        <div class="group-title">
            <h3>${groupKey}</h3>
            <div class="group-stats">
                <span class="total-count">${orderCount} pedidos</span>
                ${pendingCount > 0 ? `<span class="pending-count">${pendingCount} pendientes</span>` : ''}
            </div>
        </div>
        <div class="group-actions">
            <button class="btn btn-small btn-secondary" onclick="toggleGroup(this)">
                <i class="fas fa-chevron-up"></i>
            </button>
        </div>
    `;
    
    container.appendChild(header);
    
    // Contenedor de pedidos
    const ordersContainer = document.createElement('div');
    ordersContainer.className = 'time-group-orders';
    
    groupData.orders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
    
    container.appendChild(ordersContainer);
    
    return container;
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card ${getOrderTypeClass(order.type)}`;
    
    const isUrgent = isOrderUrgent(order);
    
    card.innerHTML = `
        ${isUrgent ? '<div class="urgent-indicator">¡URGENTE!</div>' : ''}
        
        <div class="order-header">
            <div class="order-number">${order.id}</div>
            <div class="order-type ${getOrderTypeClass(order.type)}">${order.type}</div>
        </div>
        
        <div class="order-details">
            <div class="order-detail">
                <strong>Creado:</strong>
                <span>${formatDateTime(order.creationTime)}</span>
            </div>
            <div class="order-detail">
                <strong>Límite:</strong>
                <span>${calculateDeadline(order)}</span>
            </div>
            <div class="order-detail">
                <strong>Estado:</strong>
                <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span>
            </div>
            ${order.assignedUser ? `
                <div class="order-detail">
                    <strong>Asignado a:</strong>
                    <span>${order.assignedUser}</span>
                </div>
            ` : ''}
            <div class="order-detail">
                <strong>Cliente:</strong>
                <span>${order.customer}</span>
            </div>
            <div class="order-detail">
                <strong>Dirección:</strong>
                <span>${order.address}</span>
            </div>
        </div>
        
        <div class="order-actions">
            ${order.status === 'Pendiente' ? `
                <button class="btn btn-primary btn-small" onclick="openAssignModal('${order.id}')">
                    <i class="fas fa-user-plus"></i> Tomar Pedido
                </button>
            ` : ''}
            
            ${order.status === 'Tomado' ? `
                <button class="btn btn-success btn-small" onclick="markAsSent('${order.id}')">
                    <i class="fas fa-check"></i> Marcar Enviado
                </button>
            ` : ''}
            
            <button class="btn btn-warning btn-small" onclick="printOrder('${order.id}')">
                <i class="fas fa-print"></i> Imprimir
            </button>
            
            ${hasPermission('add_notes') || hasPermission('manage_notes') ? `
                <button class="btn btn-info btn-small" onclick="openNotesModal('${order.id}')">
                    <i class="fas fa-sticky-note"></i> Notas
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

function getOrderTypeClass(type) {
    return type.toLowerCase().replace(/\s+/g, '-');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Filtros y búsqueda mejorados
function applyFilters() {
    const typeFilter = elements.typeFilter.value;
    const statusFilter = elements.statusFilter.value;
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    filteredOrders = orders.filter(order => {
        const matchesType = !typeFilter || order.type === typeFilter;
        const matchesStatus = !statusFilter || order.status === statusFilter;
        const matchesSearch = !searchTerm || 
            order.id.toLowerCase().includes(searchTerm) ||
            order.customer.toLowerCase().includes(searchTerm) ||
            order.address.toLowerCase().includes(searchTerm);
        
        return matchesType && matchesStatus && matchesSearch;
    });
    
    updateDashboard();
    renderOrders();
}

// Navegación por tabs
function switchView(view) {
    // Actualizar tabs activos
    elements.tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // Aplicar filtro según la vista
    switch(view) {
        case 'pending':
            elements.statusFilter.value = 'Pendiente';
            break;
        case 'urgent':
            elements.statusFilter.value = '';
            // Filtrar solo pedidos urgentes
            filteredOrders = orders.filter(order => isOrderUrgent(order));
            updateDashboard();
            renderOrders();
            return;
        case 'all':
        default:
            elements.statusFilter.value = '';
            break;
    }
    
    applyFilters();
}

// Actualizar dashboard de estadísticas
function updateDashboard() {
    const stats = {
        pending: orders.filter(o => o.status === 'Pendiente').length,
        taken: orders.filter(o => o.status === 'Tomado').length,
        sent: orders.filter(o => o.status === 'Enviado').length,
        urgent: orders.filter(o => isOrderUrgent(o)).length
    };
    
    elements.pendingCount.textContent = stats.pending;
    elements.takenCount.textContent = stats.taken;
    elements.sentCount.textContent = stats.sent;
    elements.urgentCount.textContent = stats.urgent;
    
    // Animar contadores
    animateCounters();
}

// Animación de contadores
function animateCounters() {
    const counters = [elements.pendingCount, elements.takenCount, elements.sentCount, elements.urgentCount];
    
    counters.forEach(counter => {
        counter.style.transform = 'scale(1.1)';
        setTimeout(() => {
            counter.style.transform = 'scale(1)';
        }, 200);
    });
}

// Acciones de pedidos mejoradas
function openAssignModal(orderId) {
    currentAssignOrderId = orderId;
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        // Mostrar información del pedido en el modal
        elements.assignOrderInfo.innerHTML = `
            <div class="order-summary">
                <h4>Información del Pedido</h4>
                <div class="order-summary-grid">
                    <div class="summary-item">
                        <strong>Pedido:</strong> ${order.id}
                    </div>
                    <div class="summary-item">
                        <strong>Tipo:</strong> <span class="order-type ${getOrderTypeClass(order.type)}">${order.type}</span>
                    </div>
                    <div class="summary-item">
                        <strong>Cliente:</strong> ${order.customer}
                    </div>
                    <div class="summary-item">
                        <strong>Límite:</strong> ${calculateDeadline(order)}
                    </div>
                </div>
            </div>
        `;
    }
    
    elements.assignModal.style.display = 'block';
    document.getElementById('username').focus();
}

async function handleAssignOrder(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (!username || !password) {
        alert('Por favor complete todos los campos');
        return;
    }
    
    try {
        // Simulación de validación y asignación
        // En producción, hacer PATCH a la API
        const order = orders.find(o => o.id === currentAssignOrderId);
        if (order) {
            order.status = 'Tomado';
            order.assignedUser = username;
            
            // Registrar en el historial
            addToHistory('assigned', order.id, {
                assignedTo: username,
                previousStatus: order.status
            });
            
            applyFilters();
            closeModal(elements.assignModal);
            e.target.reset();
            
            showNotification(`Pedido ${currentAssignOrderId} asignado a ${username}`, 'success');
        }
    } catch (error) {
        console.error('Error asignando pedido:', error);
        showNotification('Error al asignar el pedido', 'error');
    }
}

async function markAsSent(orderId) {
    if (!confirm('¿Confirma que desea marcar este pedido como enviado?')) {
        return;
    }
    
    try {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const previousStatus = order.status;
            order.status = 'Enviado';
            
            // Registrar en el historial
            addToHistory('sent', orderId, {
                previousStatus: previousStatus
            });
            
            // Simular actualización en API
            // await fetch(`${CONFIG.apiUrl}/${orderId}`, {
            //     method: 'PATCH',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ status: 'Enviado' })
            // });
            
            showNotification(`Pedido #${orderId} marcado como enviado`, 'success');
            renderOrders();
            updateDashboard();
        }
    } catch (error) {
        console.error('Error marcando pedido como enviado:', error);
        showNotification('Error al actualizar el pedido', 'error');
    }
}

function printOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const printWindow = window.open('', '_blank');
    const deadline = calculateDeadline(order);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orden de Pedido - ${order.id}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    max-width: 300px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                .print-header {
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .print-detail {
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                }
                .print-detail strong {
                    min-width: 120px;
                }
                .print-footer {
                    margin-top: 30px;
                    text-align: center;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                    font-size: 12px;
                }
                .urgent {
                    background: #000;
                    color: #fff;
                    padding: 5px;
                    text-align: center;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="print-view">
                ${isOrderUrgent(order) ? '<div class="urgent">*** URGENTE ***</div>' : ''}
                
                <div class="print-header">
                    <h2>ORDEN DE PEDIDO</h2>
                    <h3>${order.id}</h3>
                </div>
                
                <div class="print-detail">
                    <strong>Tipo:</strong>
                    <span>${order.type}</span>
                </div>
                
                <div class="print-detail">
                    <strong>Estado:</strong>
                    <span>${order.status}</span>
                </div>
                
                <div class="print-detail">
                    <strong>Creado:</strong>
                    <span>${formatDateTime(order.creationTime)}</span>
                </div>
                
                <div class="print-detail">
                    <strong>Límite:</strong>
                    <span>${deadline}</span>
                </div>
                
                ${order.assignedUser ? `
                    <div class="print-detail">
                        <strong>Asignado a:</strong>
                        <span>${order.assignedUser}</span>
                    </div>
                ` : ''}
                
                <div class="print-detail">
                    <strong>Cliente:</strong>
                    <span>${order.customer}</span>
                </div>
                
                <div class="print-detail">
                    <strong>Dirección:</strong>
                    <span>${order.address}</span>
                </div>
                
                ${order.notes ? `
                    <div class="print-detail">
                        <strong>Notas:</strong>
                        <span>${order.notes}</span>
                    </div>
                ` : ''}
                
                <div class="print-footer">
                    <p>Impreso: ${new Date().toLocaleString('es-AR')}</p>
                    <p>Sistema de Gestión Logística</p>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Registrar la impresión en el historial
    addToHistory('printed', orderId, {
        printedBy: currentUser.name,
        printTime: new Date().toISOString()
    });
    
    showNotification(`Pedido #${orderId} enviado a imprimir`, 'success');
}

// Configuración
function openSettingsModal() {
    // Verificación adicional de permisos
    if (!hasPermission('view_all')) {
        showNotification('Acceso denegado: Solo el administrador puede modificar la configuración del sistema', 'error');
        return;
    }
    
    elements.settingsModal.style.display = 'flex';
    
    // Cargar valores actuales
    document.getElementById('apiUrl').value = CONFIG.apiUrl;
    document.getElementById('colectaTime').value = CONFIG.colectaTime;
    
    // Mostrar información del usuario que accede
    const settingsHeader = document.querySelector('#settingsModal .modal-title h3');
    if (settingsHeader) {
        settingsHeader.innerHTML = `
            <i class="fas fa-cog"></i>
            Configuración del Sistema
            <small style="display: block; font-size: 0.7em; color: #64748b; font-weight: normal; margin-top: 0.25rem;">
                Acceso: ${currentUser.name} (${currentUser.role})
            </small>
        `;
    }
}

function handleSaveSettings(e) {
    e.preventDefault();
    
    // Verificación adicional de permisos
    if (!hasPermission('view_all')) {
        showNotification('Acceso denegado: Solo el administrador puede modificar la configuración', 'error');
        return;
    }
    
    const newApiUrl = document.getElementById('apiUrl').value;
    const newColectaTime = document.getElementById('colectaTime').value;
    
    // Validar formato de hora
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newColectaTime)) {
        showNotification('Formato de hora inválido. Use HH:MM', 'error');
        return;
    }
    
    // Guardar valores anteriores para el historial
    const previousConfig = {
        apiUrl: CONFIG.apiUrl,
        colectaTime: CONFIG.colectaTime
    };
    
    CONFIG.apiUrl = newApiUrl;
    CONFIG.colectaTime = newColectaTime;
    
    // Guardar en localStorage
    localStorage.setItem('apiUrl', newApiUrl);
    localStorage.setItem('colectaTime', newColectaTime);
    
    // Registrar cambio en el historial
    addToHistory('config_changed', 'SYSTEM', {
        previousApiUrl: previousConfig.apiUrl,
        newApiUrl: newApiUrl,
        previousColectaTime: previousConfig.colectaTime,
        newColectaTime: newColectaTime,
        changedBy: currentUser.name
    });
    
    showNotification('Configuración guardada correctamente', 'success');
    closeModal(elements.settingsModal);
    
    // Recargar pedidos con nueva configuración
    loadOrders();
}

function loadSettings() {
    CONFIG.colectaTime = localStorage.getItem('colectaTime') || '16:00';
    CONFIG.apiUrl = localStorage.getItem('apiUrl') || 'https://api.ejemplo.com/pedidos';
}

// Auto-refresh
function startAutoRefresh() {
    if (!CONFIG.autoRefreshEnabled) return;
    
    refreshTimer = setInterval(() => {
        loadOrders();
    }, CONFIG.refreshInterval);
    
    updateNextRefreshTime();
    
    setInterval(updateNextRefreshTime, 1000);
}

function resetAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        startAutoRefresh();
    }
}

function updateNextRefreshTime() {
    if (!nextRefreshTime) {
        nextRefreshTime = new Date(Date.now() + CONFIG.refreshInterval);
    }
    
    const now = new Date();
    const timeLeft = nextRefreshTime - now;
    
    if (timeLeft <= 0) {
        nextRefreshTime = new Date(Date.now() + CONFIG.refreshInterval);
        return;
    }
    
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    elements.nextRefresh.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Utilidades
function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
    elements.ordersGrid.style.display = show ? 'none' : 'grid';
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Agregar estilos para notificaciones si no existen
    if (!document.querySelector('.notification-styles')) {
        const style = document.createElement('style');
        style.className = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                animation: slideInRight 0.3s ease;
                max-width: 400px;
            }
            .notification-success { background: #27ae60; }
            .notification-error { background: #e74c3c; }
            .notification-info { background: #3498db; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function closeModal(modal) {
    modal.style.display = 'none';
    currentAssignOrderId = null;
}

// Función para colapsar/expandir grupos
function toggleGroup(button) {
    const groupContainer = button.closest('.time-group');
    const ordersContainer = groupContainer.querySelector('.time-group-orders');
    const icon = button.querySelector('i');
    
    if (ordersContainer.style.display === 'none') {
        ordersContainer.style.display = 'grid';
        icon.className = 'fas fa-chevron-up';
        groupContainer.classList.remove('collapsed');
    } else {
        ordersContainer.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        groupContainer.classList.add('collapsed');
    }
}

// Funciones para modal de historial
function openHistoryModal() {
    if (!hasPermission('view_history')) {
        showNotification('No tienes permisos para ver el historial', 'error');
        return;
    }
    
    const modal = document.getElementById('historyModal');
    modal.style.display = 'flex';
    
    // Cargar usuarios en el filtro
    const userFilter = document.getElementById('historyUserFilter');
    userFilter.innerHTML = '<option value="">Todos los usuarios</option>';
    getAllUsers().forEach(username => {
        const user = DEMO_USERS[username];
        const option = document.createElement('option');
        option.value = username;
        option.textContent = user.name;
        userFilter.appendChild(option);
    });
    
    loadHistory();
}

function loadHistory() {
    const filters = {
        date: document.getElementById('historyDateFilter').value,
        user: document.getElementById('historyUserFilter').value,
        action: document.getElementById('historyActionFilter').value
    };
    
    const history = getOrderHistory(filters);
    const historyContent = document.getElementById('historyContent');
    
    if (history.length === 0) {
        historyContent.innerHTML = '<div class="empty-history">No se encontraron registros en el historial</div>';
        return;
    }
    
    historyContent.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-icon ${item.action}">
                <i class="${getActionIcon(item.action)}"></i>
            </div>
            <div class="history-details">
                <div class="history-action">${getActionText(item.action)}</div>
                <div class="history-meta">
                    <span class="history-order">Pedido: ${item.orderId}</span>
                    <span>Usuario: ${item.userName}</span>
                    <span>${new Date(item.timestamp).toLocaleString('es-AR')}</span>
                </div>
                ${item.details && Object.keys(item.details).length > 0 ? 
                    `<div class="history-details-extra">${JSON.stringify(item.details, null, 2)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function filterHistory() {
    loadHistory();
}

// Funciones para modal de notas
function openNotesModal(orderId) {
    if (!hasPermission('add_notes') && !hasPermission('manage_notes')) {
        showNotification('No tienes permisos para gestionar notas', 'error');
        return;
    }
    
    const modal = document.getElementById('notesModal');
    modal.style.display = 'flex';
    
    // Buscar información del pedido
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Pedido no encontrado', 'error');
        return;
    }
    
    // Mostrar información del pedido
    const orderInfo = document.getElementById('notesOrderInfo');
    orderInfo.innerHTML = `
        <h4>Pedido #${order.id}</h4>
        <p><strong>Tipo:</strong> ${order.type}</p>
        <p><strong>Cliente:</strong> ${order.client}</p>
        <p><strong>Dirección:</strong> ${order.address}</p>
        <p><strong>Estado:</strong> ${order.status}</p>
    `;
    
    // Cargar notas existentes
    loadOrderNotes(orderId);
    
    // Guardar el ID del pedido actual
    document.getElementById('addNoteForm').dataset.orderId = orderId;
}

function loadOrderNotes(orderId) {
    const notes = getOrderNotes(orderId);
    const notesContainer = document.getElementById('existingNotes');
    
    if (notes.length === 0) {
        notesContainer.innerHTML = '<div class="empty-notes">No hay notas para este pedido</div>';
        return;
    }
    
    notesContainer.innerHTML = notes.map(note => `
        <div class="note-item">
            <div class="note-header">
                <span class="note-author">${note.authorName}</span>
                <span class="note-date">${new Date(note.timestamp).toLocaleString('es-AR')}</span>
            </div>
            <div class="note-text">${note.text}</div>
        </div>
    `).join('');
}

function handleAddNote(e) {
    e.preventDefault();
    
    const orderId = e.target.dataset.orderId;
    const noteText = document.getElementById('noteText').value;
    
    if (addOrderNote(orderId, noteText)) {
        showNotification('Nota agregada correctamente', 'success');
        loadOrderNotes(orderId);
        document.getElementById('noteText').value = '';
    } else {
        showNotification('Error al agregar la nota', 'error');
    }
}

function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    modal.style.display = 'none';
    document.getElementById('noteText').value = '';
}

// Funciones globales para eventos onclick
window.openAssignModal = openAssignModal;
window.markAsSent = markAsSent;
window.printOrder = printOrder;
window.toggleGroup = toggleGroup;
window.openNotesModal = openNotesModal;
