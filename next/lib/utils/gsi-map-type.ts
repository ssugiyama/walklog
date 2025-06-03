const createGsiMapType = (id: string, map: google.maps.Map) => {
  const tileType = 'std'
  const tileExtension = 'png'
  const zoomMax = 18
  const zoomMin = 5
  const options = {
    name: '地理院地図',
    tileSize: new google.maps.Size(256, 256),
    minZoom: zoomMin,
    maxZoom: zoomMax,
    getTile: (tileCoord, zoom, ownerDocument) => {
      const img = ownerDocument.createElement('img')
      img.id = 'gsi-map-layer-image'
      img.style.width = '256px'
      img.style.height = '256px'
      const x = (tileCoord.x % (2 ** zoom)).toString()
      const y = tileCoord.y.toString()
      img.src = `https://cyberjapandata.gsi.go.jp/xyz/${tileType}/${zoom}/${x}/${y}.${tileExtension}`
      return img
    },
  }
  map.mapTypes.set(id, options)
  const gsiLogo = document.createElement('div')
  gsiLogo.innerHTML = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" >地理院タイル</a>'
  gsiLogo.style.display = 'none'
  google.maps.event.addListener(map, 'maptypeid_changed', () => {
    const currentMapTypeID = map.getMapTypeId()
    if (currentMapTypeID === 'gsi') {
      gsiLogo.style.display = 'inline'
    } else {
      gsiLogo.style.display = 'none'
    }
  })
  map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(gsiLogo)
}

export default createGsiMapType
