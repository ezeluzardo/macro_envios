# 📋 Sistema de Gestión de Pedidos Logísticos

Una aplicación web moderna para gestionar pedidos de empresas logísticas con diferentes tipos de cadetería y horarios de retiro.

## 🚀 Formas de Ejecutar la Aplicación

### **Opción 1: Abrir Directamente (Más Fácil)**
```bash
# Simplemente haz doble clic en:
abrir-app.bat
```
O abre directamente `index.html` en tu navegador.

### **Opción 2: Con Node.js (Si lo tienes instalado)**
```bash
node server.js
```
Luego abre: http://localhost:8000

### **Opción 3: Con cualquier servidor web**
Puedes usar cualquier servidor web local como:
- Live Server (extensión de VS Code)
- XAMPP
- WAMP
- O cualquier otro servidor HTTP

## ✨ Funcionalidades Principales

### 📊 **Visualización de Pedidos**
- Tarjetas organizadas por tipo y ventana horaria
- Información completa: número, tipo, horarios, estado, usuario asignado
- Colores distintivos por tipo de pedido
- Indicadores de urgencia para pedidos próximos al límite

### ⏰ **Cálculo Automático de Horarios**
- **FLEX ML/MT**: 12:00 (antes del mediodía) o 17:00 (después)
- **COLECTA ML**: Configurable (por defecto 16:00)
- **DAC**: Límite fijo 18:00
- **PEDIDOS YA**: 2 horas después de creación

### 👤 **Asignación de Pedidos**
- Modal individual por pedido (sin login global)
- Campos: usuario y contraseña
- Actualización automática del estado

### 🖨️ **Impresión de Órdenes**
- Vista optimizada tipo ticket
- Impresión automática
- Formato profesional con todos los datos

### 🔄 **Actualización Automática**
- Refresh cada 5 minutos
- Botón de actualización manual
- Contador visual del próximo refresh

### ⚙️ **Configuración**
- Hora de COLECTA ML personalizable
- URL de API configurable
- Configuración persistente

## 🎨 Tipos de Pedidos y Colores

| Tipo | Color | Horario |
|------|-------|---------|
| FLEX ML | Azul | 12:00 / 17:00 |
| FLEX MT | Púrpura | 12:00 / 17:00 |
| COLECTA ML | Rojo | Configurable (16:00) |
| DAC | Naranja | 18:00 |
| PEDIDOS YA | Verde | +2 horas |

## 🔧 Configuración para Producción

### **Conectar a API Real**
1. Abre la aplicación
2. Haz clic en "Configuración"
3. Ingresa la URL de tu API REST
4. Guarda los cambios

### **Formato de API Esperado**
```json
[
  {
    "id": "ORD-0001",
    "type": "FLEX ML",
    "creationTime": "2024-01-15T10:30:00Z",
    "status": "Pendiente",
    "assignedUser": null,
    "customer": "Cliente Ejemplo",
    "address": "Dirección 123, Ciudad",
    "notes": "Notas adicionales"
  }
]
```

### **Endpoints Necesarios**
- `GET /pedidos` - Obtener todos los pedidos
- `PATCH /pedidos/{id}` - Actualizar pedido (asignar usuario, cambiar estado)

## 📱 Responsive Design

La aplicación está optimizada para:
- 💻 **Escritorio**: Vista completa con todas las funcionalidades
- 📱 **Tablet**: Diseño adaptado para pantallas medianas
- 📱 **Móvil**: Interfaz simplificada para operación táctil

## 🛠️ Estructura del Proyecto

```
PROYECTO MACROTEC/
├── index.html          # Página principal
├── styles.css          # Estilos y diseño
├── script.js           # Lógica de la aplicación
├── server.js           # Servidor Node.js (opcional)
├── abrir-app.bat       # Ejecutor para Windows
└── README.md           # Este archivo
```

## 🔍 Características Técnicas

- **Sin dependencias externas** (excepto Font Awesome para iconos)
- **Datos simulados** incluidos para demostración
- **LocalStorage** para configuración persistente
- **Código modular** y bien documentado
- **Manejo de errores** y estados de carga
- **Notificaciones** visuales para acciones

## 🚀 Próximos Pasos

1. **Prueba la aplicación** con los datos de demostración
2. **Configura tu API** usando el modal de configuración
3. **Personaliza tipos de pedidos** según tus necesidades
4. **Ajusta horarios** de acuerdo a tu operación

## 📞 Soporte

Para modificaciones o soporte técnico, revisa el código fuente que está completamente documentado y es fácil de personalizar.

---

**¡La aplicación está lista para usar!** 🎉
