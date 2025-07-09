//this portion creates the map

//this was where I mainly has issues, I need to make sure that I am properly defining what I am working on before I actually try to do things with it

var map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cm9641e8k003r01qh78je06h6/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
                 '© <a href="https://www.mapbox.com/">Mapbox</a>',

    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19
}).addTo(map);

//popups

function onEachFeature(feature, layer) {

    var popupContent = "";
    if (feature.properties) {

        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

function getData() {
    fetch("data/megaCities.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){            
            var geojsonMarkerOptions = {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            };

        L.geoJSON(json, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                },
                onEachFeature: onEachFeature
            }).addTo(map);
        });
}

getData();