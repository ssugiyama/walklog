export default class PolygonManager extends google.maps.MVCObject {
    constructor(optOptions) {
        super();
        this.polygons = {};
        const options = optOptions || {};
        this.setValues(options);
    }
    addPolygon(id, str) {
        const paths = str.split(' ').map(element => google.maps.geometry.encoding.decodePath(element));
        const pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(this.styles);
        this.polygons[id] = pg;
        google.maps.event.addListener(pg, 'click',  () => {
            this.deletePolygon(id, pg);
        });
        pg.setMap(this.map);
        return pg;
    }
    deletePolygon(id, pg) {
        pg.setMap(null);
        pg = null;
        delete this.polygons[id];
        google.maps.event.trigger(this, 'polygon_deleted', id);
    }
    deleteAll() {
        for (const id of Object.keys(this.polygons)) {
            const pg = this.polygons[id];
            pg.setMap(null);
        }
        this.polygons = {};
    }
    styles_changed() {
        for (const id of Object.keys(this.polygons)) {
            const pg = this.polygons[id];
            pg.setOptions(this.styles);
        }
    }
    showAll() {
        for (const id of Object.keys(this.polygons)) {
            const pg = this.polygons[id];
            pg.setMap(this.map);
        }
    }
    hideAll() {
        for (const id of Object.keys(this.polygons)) {
            const pg = this.polygons[id];
            pg.setMap(null);
        }
    }
    idSet() {
        return new Set(Object.keys(this.polygons));
    }
}