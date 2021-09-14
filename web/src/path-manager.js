const jsSHA = require('jssha');

export default class PathManager extends google.maps.MVCObject {
    constructor(optOptions) {
        super();
        const options = optOptions || {};
        this.setValues(options);
        this.polylines = new Object();
        const drawingStyle = Object.assign({}, this.styles.new, this.styles.selected);
        this.drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYLINE,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYLINE]
            },
            polylineOptions: drawingStyle
        });
        this.drawingManager.setDrawingMode(null);
        this.drawingManager.setMap(this.map);
        this.set('length', 0);
        this.set('prevSelection', null);
        this.set('prevCurrent', null);
        google.maps.event.addListener(this.drawingManager, 'polylinecomplete', polyline => {
            polyline.setMap(null);
            google.maps.event.trigger(this, 'polylinecomplete', polyline);
            this.drawingManager.setDrawingMode(null);
        });
        this.lastClickLatLng = null;
    }
    applyPath(path, append) {
        if (this.selection && append) {
            if (this.current == this.selection) {
                const pl = new google.maps.Polyline({});
                const newpath = Object.assign([], this.selection.getPath().getArray());
                newpath.push(...path);
                pl.setPath(newpath);
                this.addPolyline(pl);
                this.set('selection', pl);
            }
            else {
                const ar = this.selection.getPath().getArray();
                ar.push(...path);
                this.selection.setPath(ar);
                this.updateLength();
            }
        }
        else {
            const pl = new google.maps.Polyline({});
            pl.setPath(path);
            this.addPolyline(pl);
            this.set('selection', pl);
        }
    }

    pathToHash(path) {
        const key = typeof(path) === 'string' ? path : google.maps.geometry.encoding.encodePath(path);
        const obj = new jsSHA('SHA-1', 'TEXT');
        obj.update(key);
        return obj.getHash('B64');
    }

    deletePolyline(pl) {
        if (pl == this.selection) {
            this.set('selection', null);
        }
        if ( pl == this.current) {
            return;
        }
        const key = this.pathToHash(pl.getPath());
        pl.setMap(null);
        delete this.polylines[key];
    }

    deleteSelection() {
        if(this.selection != null){
            const key = this.pathToHash(this.getEncodedSelection());
            this.selection.setMap(null);
            this.set('selection', null);
            delete this.polylines[key];
        }
    }

    deleteAll(retainTemporaryAndSelection) {
        if ( !retainTemporaryAndSelection ) {
            this.set('selection', null);
        }
        // retain current
        const currentKey = this.pathToHash(this.getEncodedCurrent());
        for (var key in this.polylines) {
            if (key == currentKey) continue;
            const [pl, item] = this.polylines[key];
            if (retainTemporaryAndSelection && !item ) continue;
            if (retainTemporaryAndSelection &&  pl == this.selection) continue;
            pl.setMap(null);
            delete this.polylines[key];
        }
    }

    searchPolyline(path) {
        var key = this.pathToHash(path);
        return this.polylines[key];
    }

    showPath(path, select, current, item) {
        const pair = this.searchPolyline(path);
        let pl = pair && pair[0];
        if (typeof(path) == 'string') {
            path = google.maps.geometry.encoding.decodePath(path);
        }

        if (!pl) {
            pl = new google.maps.Polyline({});
            pl.setPath(path);
            this.addPolyline(pl, item);
        }
        else if (item) {
            pair[1] = item;
            pl.setOptions(this.getPolylineStyle(pl));
        }
        if((select || current) && path.length > 0) {
            if (select) {
                this.set('selection', pl);
            } else if (current) {
                this.set('current', pl);
            }
            let xmin, xmax, ymin, ymax;
            for (let i = 0; i < path.length; i++ ) {
                const elem = path[i];
                if (i == 0) {
                    xmin = xmax = elem.lng();
                    ymin = ymax = elem.lat();
                }
                else {
                    if (xmin > elem.lng()) xmin = elem.lng();
                    if (xmax < elem.lng()) xmax = elem.lng();
                    if (ymin > elem.lat()) ymin = elem.lat();
                    if (ymax < elem.lat()) ymax = elem.lat();
                }
            }
            const center = { lat: (ymin+ymax)/2, lng: (xmin+xmax)/2 };
            this.map.panTo(center);
        }
    }

    addPolyline(pl, item){
        pl.setOptions(item ? this.styles.normal : this.styles.new);
        pl.setMap(this.map);
        const key = this.pathToHash(pl.getPath());
        this.polylines[key] = [pl, item];
        google.maps.event.addListener(pl, 'click', event => {
            this.lastClickLatLng = event.latLng;
            if (pl.getEditable()) {
                pl.setEditable(false);
            } else {
                this.set('selection', pl == this.selection ? null : pl);
            }
        });
        var deleteNode = mev => {
            if (mev.vertex != null) {
                pl.getPath().removeAt(mev.vertex);
            }
            else if (!pl.getEditable()) {
                this.deletePolyline(pl);
            }
        };
        google.maps.event.addListener(pl, 'rightclick', deleteNode);
        var pathCallback = () => {
            this.updateLength();
        };
        google.maps.event.addListener(pl.getPath(), 'insert_at', pathCallback);
        google.maps.event.addListener(pl.getPath(), 'remove_at', pathCallback);
        google.maps.event.addListener(pl.getPath(), 'set_at', pathCallback);
    }

    getPolylineStyle(pl) {
        const pair = this.searchPolyline(google.maps.geometry.encoding.encodePath(pl.getPath()));
        let style = Object.assign({}, pair && pair[1] ? this.styles.normal : this.styles.new);
        if ( pl == this.current ) {
            style = Object.assign(style, this.styles.current);
        }
        if ( pl == this.selection ) {
            style = Object.assign(style, this.styles.selected);
        }
        return style;
    }

    selection_changed(){
        const prevSelection = this.get('prevSelection');
        if (prevSelection){
            prevSelection.setOptions(this.getPolylineStyle(prevSelection));
            prevSelection.setEditable(false);
        }
        const selection = this.get('selection');
        this.set('prevSelection', selection);

        if (selection) {
            selection.setOptions(this.getPolylineStyle(selection));
        }
        this.updateLength();
        this.unbind('editable');
        if (selection) this.bindTo('editable', selection);
    }

    getSelection() {
        return this.selection;
    }

    getEncodedSelection() {
        if (this.selection) {
            return google.maps.geometry.encoding.encodePath(this.selection.getPath());
        }
        else {
            return null;
        }
    }

    getEncodedCurrent() {
        if (this.current) {
            return google.maps.geometry.encoding.encodePath(this.current.getPath());
        }
        else {
            return null;
        }
    }

    current_changed(){
        const prevCurrent = this.get('prevCurrent');
        if (prevCurrent){
            prevCurrent.setOptions(this.getPolylineStyle(prevCurrent));
        }
        const current = this.get('current');
        this.set('prevCurrent', current);

        if (current) {
            current.setOptions(this.getPolylineStyle(current));
        }
    }

    updateLength(){
        if (this.selection)
            this.set('length', google.maps.geometry.spherical.computeLength(this.selection.getPath())/1000);
        else
            this.set('length', '');
    }
    selectionAsGeoJSON() {
        if (this.selection) {
            return JSON.stringify({
                type: 'LineString',
                coordinates: this.selection.getPath().getArray().map(p => {
                    return [p.lng(), p.lat()];
                })
            });
        }
        return '';
    }
}
