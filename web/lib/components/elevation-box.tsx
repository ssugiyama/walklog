import React from 'react'
import Box from '@mui/material/Box'
import bb, { Chart, line } from 'billboard.js'
import 'billboard.js/dist/billboard.css'
import './billboard.dark.css'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { useMapContext } from '../utils/map-context'
const { useRef, useEffect } = React

type ElevationRefs = {
  chart?: Chart
  elevator?: google.maps.ElevationService
  elevationResults?: google.maps.ElevationResult[]
  elevationInfoWindow?: google.maps.InfoWindow
}

const ElevationBox = () => {
  const [mapState] = useMapContext()
  const config = useConfig()
  const rootRef = useRef({})
  const refs = useRef<ElevationRefs>({})
  const [data] = useData()
  const selectedItem = data.current
  const mapLoaded = !!mapState.map
  const { map, elevationInfoWindow } = mapState
  const handleHover = (d) => {
    if (!d) {
      refs.current.elevationInfoWindow.close()
    } else {
      const elevation = refs.current.elevationResults[d.index]
      if (!elevation) return
      const y = Math.round(d.value)
      elevationInfoWindow.open(map)
      elevationInfoWindow.setPosition(new google.maps.LatLng(elevation.location.lat(), elevation.location.lng()))
      elevationInfoWindow.setContent(`${y}m`)
    }
  }
  const plotElevation = (results, status) => {
    if (status === google.maps.ElevationStatus.OK) {
      refs.current.elevationResults = results
      const data = results.map((result) => result.elevation)
      if (!refs.current.chart) {
        const drawingStyles = config.drawingStyles
        refs.current.chart = bb.generate({
          bindto: rootRef.current,
          data: {
            columns: [['elevation', 0]],
            type: line(),
            onover(d) {
              handleHover(d)
            },
            colors: { elevation: drawingStyles.polylines.current.strokeColor },
          },
          legend: {
            show: false,
          },
          tooltip: {
            show: false,
          },
          axis: {
            x: {
              show: false,
            },
            y: {
              tick: {
                culling: true,
              },
            },
          },
          line: {
            zerobased: true,
          },
          point: {
            r: 1.5,
          },
        })
      }
      refs.current.chart.load({
        columns: [
          ['elevation'].concat(data),
        ],
      })
    }
  }
  const requestElevation = () => {
    if (!selectedItem) return
    const path = google.maps.geometry.encoding.decodePath(selectedItem.path)

    const pathRequest = {
      path,
      samples: 256,
    }
    refs.current.elevator.getElevationAlongPath(pathRequest, (results, status) => {
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
  console.log('elevation box', selectedItem)
  if (selectedItem) {

    return (
      <Box data-testid="elevation-box" width="100%" height="20vh" ref={rootRef} />
    )
  }
  return null
}

export default ElevationBox
