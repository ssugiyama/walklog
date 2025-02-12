import config from 'react-global-configuration';

export const getTitles = (item) => {
    const titles = [config.get('siteName')];
    if (item) {
        titles.unshift(`${item.date} : ${item.title} (${item.length.toFixed(1)} km)`);
    }
    return titles;
};

export const idToUrl = (id, params = null) => `${config.get('itemPrefix')}${id}${params ? `?${Object.keys(params).map((k) => `${k}=${params[k] || ''}`).join('&')}` : ''}`;

export const getCanonical = (data) => config.get('baseUrl') + (data ? idToUrl(data.id) : '/');
