export const getTitles = (config, item) => {
  const titles = [config.siteName]
  if (item) {
    titles.unshift(`${item.date} : ${item.title} (${item.length.toFixed(1)} km)`)
  }
  return titles
}

export const idToShowUrl = (id, params: URLSearchParams = null) => `/show/${id}${params ? `?${params.toString()}` : ''}`
export const idToEditUrl = (id, params: URLSearchParams = null) => `/edit/${id}${params ? `?${params.toString()}` : ''}`
export const getCanonical = (config, data) => config.baseUrl + (data ? idToShowUrl(data.id) : '/')
