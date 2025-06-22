export const getTitles = (config, item) => {
  const titles = [config.siteName]
  if (item) {
    titles.unshift(`${item.date} : ${item.title} (${item.length.toFixed(1)} km)`)
  }
  return titles
}

export const idToUrl = (id, params: URLSearchParams = null) => `/show/${id}${params ? `?${params.toString()}` : ''}`

export const getCanonical = (config, data) => config.baseUrl + (data ? idToUrl(data.id) : '/')
