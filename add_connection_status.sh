#!/bin/bash

# Lista de componentes principales que necesitan ConnectionStatus
COMPONENTS=(
  "src/pages/Equipos/Equipos.js"
  "src/pages/Pedidos/Pedidos.js"
  "src/pages/Movimientos/Movimientos.js"
  "src/pages/Envios/Envios.js"
  "src/pages/Ajustes/Ajustes.js"
  "src/pages/Configuracion/Configuracion.js"
  "src/pages/HistorialEquipos/HistorialEquipos.js"
  "src/pages/RegistroPedidos/RegistroPedidos.js"
  "src/pages/Reportes/Reportes.js"
  "src/pages/Perfil/Perfil.js"
)

for component in "${COMPONENTS[@]}"; do
  echo "Procesando $component..."
  
  # Verificar si el archivo existe
  if [ ! -f "$component" ]; then
    echo "  ❌ Archivo no encontrado: $component"
    continue
  fi
  
  # Verificar si ya tiene ConnectionStatus import
  if grep -q "import ConnectionStatus" "$component"; then
    echo "  ✅ Ya tiene ConnectionStatus import"
  else
    # Agregar import después de los otros imports de UI
    sed -i '/import.*UI.*from/a import ConnectionStatus from '\''../../components/UI/ConnectionStatus'\'';' "$component" 2>/dev/null || {
      # Si falla, agregar después del último import
      sed -i '/^import.*from/a import ConnectionStatus from '\''../../components/UI/ConnectionStatus'\'';' "$component"
    }
    echo "  ✅ Agregado import de ConnectionStatus"
  fi
  
done

echo "✅ Proceso completado"
