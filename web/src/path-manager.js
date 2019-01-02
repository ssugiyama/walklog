const jsSHA = require('jssha');

export default class PathManager extends google.maps.MVCObject {
    constructor(opt_options) {
        super();
        const options = opt_options || {};
        this.setValues(options);
        this.polylines = new Object();
        this.generalStyle = {strokeColor: '#0000ff', strokeOpacity: 0.5, strokeWeight: 2, zIndex: 30};
        this.selectedStyle = {strokeOpacity: 0.8, strokeWeight: 4, zIndex: 29};
        this.highlightedStyle = {strokeColor: '#ff0000', strokeOpacity: 0.8, zIndex: 28};
        const drawingStyle = Object.assign({}, this.generalStyle, this.selectedStyle);
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
        this.set('prevHighlight', null);
        google.maps.event.addListener(this.drawingManager, 'polylinecomplete', polyline => {
            google.maps.event.trigger(this, 'polylinecomplete', polyline);
            this.drawingManager.setDrawingMode(null);
        });
    }
    applyPath(path, append) {
        if (this.selection && append) {
            if (this.highlight == this.selection) {
                const pl = new google.maps.Polyline({});
                const newpath = Object.assign([], this.selection.getPath().getArray());
                newpath.push(...path);
                pl.setPath(newpath);
                this.addPolyline(pl);
                this.set('selection', pl);
            }
            else {
                this.selection.getPath().push(...path);
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

    deletePath() {
        if(this.selection != null){
            const selection = this.selection;
            const key = this.pathToHash(this.getEncodedSelection());
            this.set('selection', null);
            // retain highlight
            const highlightKey = this.pathToHash(this.getEncodedHighlight());
            if (key == highlightKey) return;
            selection.setMap(null);
            delete this.polylines[key];
        }
    }

    deleteAll() {
        this.set('selection', null);
        // retain highlight
        const highlightKey = this.pathToHash(this.getEncodedHighlight());
        for (var key in this.polylines) {
            if (key == highlightKey) continue;
            var pl = this.polylines[key];
            pl.setMap(null);
            delete this.polylines[key];
        }
    }

    searchPolyline(path) {
        var key = this.pathToHash(path);
        return this.polylines[key];
    }

    showPath(path, select, highlight) {
        var pl = this.searchPolyline(path);
        if (typeof(path) == 'string') {
            path = google.maps.geometry.encoding.decodePath(path);
        }

        if (!pl) {
            pl = new google.maps.Polyline({});
            pl.setPath(path);
            this.addPolyline(pl);
        }
        if((select || highlight) && path.length > 0) {
            if (select) {
                this.set('selection', pl);
            } else if (highlight) {
                this.set('highlight', pl)
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

    addPolyline(pl){
        pl.setOptions(this.generalStyle);
        pl.setMap(this.map);
        const key = this.pathToHash(pl.getPath());
        this.polylines[key] = pl;
        google.maps.event.addListener(pl, 'click', () => {
            this.set('selection', pl);
        });
        var deleteNode = mev => {
            if (mev.vertex != null) {
                pl.getPath().removeAt(mev.vertex);
            }
        };
        google.maps.event.addListener(pl, 'rightclick', deleteNode);
        var path_callback = () => {
            this.updateLength();
        };
        google.maps.event.addListener(pl.getPath(), 'insert_at', path_callback);
        google.maps.event.addListener(pl.getPath(), 'remove_at', path_callback);
        google.maps.event.addListener(pl.getPath(), 'set_at', path_callback);
    }

    selection_changed(){
        const prevSelection = this.get('prevSelection');
        if (prevSelection){
            let style = Object.assign({}, this.generalStyle);
            if ( this.prevSelection == this.highlight ) {
                style = Object.assign(style, this.highlightedStyle);
            }
            prevSelection.setOptions(style);
            prevSelection.setEditable(false);
        }
        const selection = this.get('selection');
        this.set('prevSelection', selection);

        if (selection) {
            let style = Object.assign({}, this.generalStyle, this.selectedStyle);
            if ( selection == this.highlight ) {
                style = Object.assign(style, this.highlightedStyle);
            }
            selection.setOptions(style);
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

    getEncodedHighlight() {
        if (this.highlight) {
            return google.maps.geometry.encoding.encodePath(this.highlight.getPath());
        }
        else {
            return null;
        }
    }

    highlight_changed(){
        const prevHighlight = this.get('prevHighlight');
        if (prevHighlight){
            let style = Object.assign({}, this.generalStyle);
            if ( this.prevHighlight == this.selection ) {
                style = Object.assign(style, this.selectedStyle);
            }
            prevHighlight.setOptions(style);
        }
        const highlight = this.get('highlight');
        this.set('prevHighlight', highlight);

        if (highlight) {
            let style = Object.assign({}, this.generalStyle, this.highlightedStyle);
            if ( this.selection == this.highlight ) {
                style = Object.assign(style, this.selectedStyle);
            }
            highlight.setOptions(style);
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
