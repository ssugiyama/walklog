import React from 'react'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { useMapContext } from '../utils/map-context'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
const { useRef, useEffect, useState } = React

type ElevationRefs = {
  elevator?: google.maps.ElevationService
  elevationResults?: google.maps.ElevationResult[]
}

type TooltipPayload = { payload: { index: number; elevation: number } }

const ElevationBox = () => {
  const [mapState] = useMapContext()
  const config = useConfig()
  const refs = useRef<ElevationRefs>({})
  const [data] = useData()
  const [chartData, setChartData] = useState<Array<{index: number, elevation: number}>>([])
  const selectedItem = data.current
  const mapLoaded = !!mapState.map
  const { map, elevationInfoWindow } = mapState
  
  const handleTooltipChange = (active: boolean, payload: TooltipPayload[]) => {
    if (!refs.current.elevationResults || !elevationInfoWindow || !map) return
    
    if (!active || !payload || !payload.length) {
      elevationInfoWindow.close()
      return
    }
    
    const data = payload[0].payload
    const elevation = refs.current.elevationResults[data.index]
    if (!elevation) return
    
    const y = Math.round(data.elevation)
    elevationInfoWindow.open(map)
    elevationInfoWindow.setPosition(new google.maps.LatLng(elevation.location.lat(), elevation.location.lng()))
    elevationInfoWindow.setContent(`${y}m`)
  }
  
  const plotElevation = (results: google.maps.ElevationResult[], status: google.maps.ElevationStatus) => {
    if (status === google.maps.ElevationStatus.OK) {
      refs.current.elevationResults = results
      const formattedData = results.map((result, index) => ({
        index,
        elevation: result.elevation
      }))
      setChartData(formattedData)
    }
  }
  
  const requestElevation = () => {
    if (!selectedItem) return
    const path = google.maps.geometry.encoding.decodePath(selectedItem.path)

    const pathRequest = {
      path,
      samples: 256,
    }
    refs.current.elevator?.getElevationAlongPath(pathRequest, (results, status) => {
      plotElevation(results, status)
    })
  }

  const updateChart = () => {
    if (!mapLoaded) return
    if (!refs.current.elevator && !process.env.TEST_ELEVATION) {
      refs.current.elevator = new google.maps.ElevationService()
    }
    requestElevation()
  }
  
  useEffect(() => {
    updateChart()
  }, [selectedItem, mapLoaded])
  
  if (selectedItem && chartData.length > 0) {
    const strokeColor = config?.shapeStyles?.polylines?.current?.strokeColor || '#82ca9d'
    
    return (
      <div data-testid="elevation-box" style={{ width: '100%', height: '20vh' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="index" 
              tick={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${Math.round(value)}m`}
            />
            <Tooltip
              content={({ active, payload }: { active: boolean, payload: TooltipPayload[]}) => {
                
                handleTooltipChange(active || false, payload)
                return null // カスタムツールチップは使わず、Google Maps InfoWindowを使用
              }}
            />
            <Line 
              type="monotone" 
              dataKey="elevation" 
              stroke={strokeColor}
              strokeWidth={2}
              dot={{ r: 1.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }
  return null
}

export default ElevationBox
