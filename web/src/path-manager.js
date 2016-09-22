export default class PathManager extends google.maps.MVCObject {
    constructor(opt_options) {
        super();
        var options = opt_options || {};
        this.setValues(options);
        this.polylines = new Object();
        this.generalStyle = {strokeColor : "#0000ff", strokeOpacity: 0.5, zIndex: 10};
        this.selectedStyle = {strokeColor : "#ff0000", strokeOpacity : 0.7, zIndex: 10};
        this.drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYLINE,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYLINE]
            },
            polylineOptions: this.selectedStyle
        });
        this.drawingManager.setDrawingMode(null);
        this.drawingManager.setMap(this.map);
        this.set('length', 0);
        this.set('prevSelection', null);
        google.maps.event.addListener(this.drawingManager, 'polylinecomplete', polyline => {
            if (this.selection && confirm('Will you append the path?')) {
                polyline.getPath().forEach(elm => {
                    this.selection.getPath().push(elm);
                });
                polyline.setMap(null);
                this.updateLength();
            }
            else {
                this.addPolyline(polyline);
                this.set('selection', polyline);
            }
            this.drawingManager.setDrawingMode(null);
        });
    }

    deletePath() {
        if(this.selection != null){
            var key = this.getEncodedSelection();
            this.selection.setMap(null);
            this.set('selection', null);
            delete this.polylines[key];
        }
    }

    deleteAll() {
        this.set('selection', null);
        for (var key in this.polylines) {
            var pl = this.polylines[key];
            pl.setMap(null);
            delete this.polylines[key];
        }
    }

    searchPolyline(path) {
        var key = typeof(path) === 'string' ? path : google.maps.geometry.encoding.encodePath(path);
        return this.polylines[key];;
    }

    showPath(path, select) {
        var pl = this.searchPolyline(path);
        if (typeof(path) == 'string') {
            path = google.maps.geometry.encoding.decodePath(path);
        }
        if (!pl) {
            pl = new google.maps.Polyline({});
            pl.setPath(path);
            this.addPolyline(pl);
        }
        if(select && pl.getPath().getLength() > 0) {
            this.set('selection', pl);
            var xmin, xmax, ymin, ymax;
            pl.getPath().forEach(function (elem, i){
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
            });
            var center = new google.maps.LatLng((ymin+ymax)/2, xmin);
            this.map.panTo(center);
        }
    }

    addPolyline(pl){
        pl.setOptions(this.generalStyle);
        pl.setMap(this.map);
        var key = google.maps.geometry.encoding.encodePath(pl.getPath());
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
        var prevSelection = this.get('prevSelection');
        if (prevSelection){
            prevSelection.setOptions(this.generalStyle);
            prevSelection.setEditable(false);
        }
        var selection = this.get('selection');
        this.set('prevSelection', selection);

        if (selection) {
            selection.setOptions(this.selectedStyle);
            var path = this.selection.getPath();
            var len = path.getLength();
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

    updateLength(){
        if (this.selection)
            this.set('length', google.maps.geometry.spherical.computeLength(this.selection.getPath())/1000);
        else
            this.set('length', "");
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
    };
}
