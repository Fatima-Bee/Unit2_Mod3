//this portion creates the map

//this was where I mainly has issues, I need to make sure that I am properly defining what I am working on before I actually try to do things with it

var map = L.map('map').setView([25.531799, -80.318645], 13);

L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cm9641e8k003r01qh78je06h6/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
                 '© <a href="https://www.mapbox.com/">Mapbox</a>',

    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19
}).addTo(map);

//this creates the geojson point

var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "The edge of the world",
        "popupContent": "My favorite local spot"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [25.531799, -80.318645]
    }
};

//this is what adds it to the map

L.geoJSON(geojsonFeature, {
    onEachFeature: function (feature, layer) {
        if (feature.properties && feature.properties.popupContent) {
            layer.bindPopup(feature.properties.popupContent);
        }
    }
}).addTo(map);



var myPolygon = {
    "type": "Feature",
    "properties": {
        "name": "My Area",
        "popupContent": "Edge of the World."
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-80.319, 25.532],
            [-80.318, 25.532],
            [-80.318, 25.531],
            [-80.319, 25.531],
            [-80.319, 25.532]
        ]]
    }
};

L.geoJSON(myPolygon, {
    style: {
        color: "#ff7800",
        weight: 2,
        opacity: 0.65
    },
    onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.popupContent);
    }
}).addTo(map);