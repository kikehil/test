// Configuración de la API
const API_BASE_URL = '/api';

// Función para obtener el token de autenticación
function getAuthToken() {
  return localStorage.getItem('accessToken');
}

// Función para hacer peticiones autenticadas
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  try {
    console.log(`API Request: ${API_BASE_URL}${endpoint}`, config);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Respuesta no JSON:', text);
      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      console.error('Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      if (response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
      
      throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Error en API:', error);
    // Si es un error de red, agregar más información
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Error de conexión. Verifica tu conexión a internet.');
    }
    throw error;
  }
}

// API de Autenticación
const authAPI = {
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
  },
  getPerfil: async () => {
    return apiRequest('/auth/perfil');
  }
};

// API de Clientes
const clientesAPI = {
  obtenerTodos: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/clientes?${queryString}`);
  },
  obtenerPorId: async (id) => {
    return apiRequest(`/clientes/${id}`);
  },
  crear: async (cliente) => {
    return apiRequest('/clientes', {
      method: 'POST',
      body: JSON.stringify(cliente)
    });
  },
  actualizar: async (id, cliente) => {
    return apiRequest(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cliente)
    });
  },
  eliminar: async (id) => {
    return apiRequest(`/clientes/${id}`, {
      method: 'DELETE'
    });
  },
  obtenerHistorial: async (id) => {
    return apiRequest(`/clientes/${id}/cotizaciones`);
  }
};

// API de Productos
const productosAPI = {
  obtenerTodos: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/productos?${queryString}`);
  },
  buscar: async (q) => {
    return apiRequest(`/productos/buscar?q=${encodeURIComponent(q)}`);
  },
  obtenerPorId: async (id) => {
    return apiRequest(`/productos/${id}`);
  },
  crear: async (producto) => {
    return apiRequest('/productos', {
      method: 'POST',
      body: JSON.stringify(producto)
    });
  },
  actualizar: async (id, producto) => {
    return apiRequest(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto)
    });
  },
  eliminar: async (id) => {
    return apiRequest(`/productos/${id}`, {
      method: 'DELETE'
    });
  }
};

// API de Cotizaciones
const cotizacionesAPI = {
  obtenerTodas: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/cotizaciones?${queryString}`);
  },
  obtenerPorId: async (id) => {
    return apiRequest(`/cotizaciones/${id}`);
  },
  crear: async (cotizacion) => {
    return apiRequest('/cotizaciones', {
      method: 'POST',
      body: JSON.stringify(cotizacion)
    });
  },
  actualizar: async (id, cotizacion) => {
    return apiRequest(`/cotizaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cotizacion)
    });
  },
  cambiarEstado: async (id, estado) => {
    return apiRequest(`/cotizaciones/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado })
    });
  },
  duplicar: async (id) => {
    return apiRequest(`/cotizaciones/${id}/duplicar`, {
      method: 'POST'
    });
  },
  generarPDF: async (id) => {
    const token = getAuthToken();
    if (!token) {
      utils.mostrarError('Debes iniciar sesión para generar PDFs');
      return;
    }
    // Crear un enlace temporal con el token en el header
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/cotizaciones/${id}/pdf`;
    link.target = '_blank';
    // Usar fetch para obtener el PDF con el token
    fetch(`${API_BASE_URL}/cotizaciones/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Error al generar PDF');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = `cotizacion_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      utils.mostrarError('Error al generar PDF: ' + error.message);
    });
  },
  enviarPorCorreo: async (id) => {
    return apiRequest(`/cotizaciones/${id}/enviar`, {
      method: 'POST'
    });
  }
};

// API de Dashboard
const dashboardAPI = {
  obtenerEstadisticas: async () => {
    return apiRequest('/dashboard/estadisticas');
  }
};

// API de Pagos
const pagosAPI = {
  obtenerTodos: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/pagos?${queryString}`);
  },
  crear: async (pago) => {
    return apiRequest('/pagos', {
      method: 'POST',
      body: JSON.stringify(pago)
    });
  },
  actualizar: async (id, pago) => {
    return apiRequest(`/pagos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pago)
    });
  },
  eliminar: async (id) => {
    return apiRequest(`/pagos/${id}`, {
      method: 'DELETE'
    });
  }
};

// API de Facturas
const facturasAPI = {
  obtenerTodas: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/facturas?${queryString}`);
  },
  crear: async (factura) => {
    return apiRequest('/facturas', {
      method: 'POST',
      body: JSON.stringify(factura)
    });
  },
  actualizar: async (id, factura) => {
    return apiRequest(`/facturas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(factura)
    });
  },
  eliminar: async (id) => {
    return apiRequest(`/facturas/${id}`, {
      method: 'DELETE'
    });
  }
};

// Utilidades
const utils = {
  formatearFecha: (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX');
  },
  formatearMoneda: (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad);
  },
  mostrarError: (mensaje) => {
    alert(mensaje);
  },
  mostrarExito: (mensaje) => {
    alert(mensaje);
  }
};

