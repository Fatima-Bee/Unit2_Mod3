var minValue;
var dataLayer;
var markers = [];
var allFeatures = [];
var currentIndex = 0;
var attributes = ["Pop_1985", "Pop_1990", "Pop_1995", "Pop_2000", "Pop_2005", "Pop_2010", "Pop_2015"];

var dataStats = {};  // holds min, mean, max for legend scaling

//Step 1: Create the Map
function createMap() {
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cm9641e8k003r01qh78je06h6/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
            '© <a href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19
    }).addTo(map);

    getData(map);
}

// Calculate min, mean, max for all data values (rename from calculateMinValue)
function calcStats(data) {
    var allValues = [];

    for (var city of data.features) {
        for (var year = 1985; year <= 2015; year += 5) {
            var value = city.properties["Pop_" + String(year)];
            allValues.push(value);
        }
    }

    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    var sum = allValues.reduce((a, b) => a + b, 0);
    dataStats.mean = sum / allValues.length;

    // Also set minValue for your radius calc to maintain compatibility
    minValue = dataStats.min;
}

function calcPropRadius(attValue) {
    var minRadius = 5;
    var radius = 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius;
    return radius;
}

function createPropSymbols(data, attribute) {
    if (dataLayer) {
        map.removeLayer(dataLayer);
    }

    markers = [];

    dataLayer = L.geoJSON(data, {
        pointToLayer: function(feature, latlng) {
            var attValue = Number(feature.properties[attribute]);

            var options = {
                fillColor: "#ffc5c0",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                radius: calcPropRadius(attValue)
            };

            var layer = L.circleMarker(latlng, options);

            var popupContent = `<p><b>City:</b> ${feature.properties.City}</p>
                                <p><b>${attribute}:</b> ${feature.properties[attribute]}</p>`;

            layer.bindPopup(popupContent);

            layer._popupData = {
                attribute: attribute,
                value: feature.properties[attribute],
                city: feature.properties.City
            };

            markers.push(layer);

            return layer;
        }
    });

    dataLayer.addTo(map);
}

function calcYearStats(attribute) {
    var yearValues = allFeatures.map(f => f.properties[attribute]);

    dataStats.min = Math.min(...yearValues);
    dataStats.max = Math.max(...yearValues);
    var sum = yearValues.reduce((a, b) => a + b, 0);
    dataStats.mean = sum / yearValues.length;

    minValue = dataStats.min; // Update for calcPropRadius()
}

function updatePropSymbols(attribute) {
    calcYearStats(attribute);

    markers.forEach(function(marker, index) {
        var attValue = Number(allFeatures[index].properties[attribute]);
        var radius = calcPropRadius(attValue);

        marker.setRadius(radius);

        var popupContent = `<p><b>City:</b> ${allFeatures[index].properties.City}</p>
                            <p><b>${attribute}:</b> ${attValue}</p>`;

        marker.setPopupContent(popupContent);
        marker._popupData = {
            attribute: attribute,
            value: attValue,
            city: allFeatures[index].properties.City
        };
    });

    var year = attribute.split("_")[1];
    var legendYear = document.querySelector(".legend-year");
    if (legendYear) {
        legendYear.innerHTML = year;
    }

    updateLegend(attribute, 0, "City Name");
}

//Step 7: Buttons
function createSequenceControls(attributes) {
    var SequenceControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'sequence-control-container');

            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/leftflower.png" width="30" height="30"></button>');
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">');
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/rightflower.png" width="30" height="30"></button>');

            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    map.addControl(new SequenceControl());

    var slider = document.querySelector(".range-slider");
    slider.max = attributes.length - 1;
    slider.min = 0;
    slider.value = 0;
    slider.step = 1;

    slider.addEventListener('input', function () {
        var attrIndex = parseInt(this.value);
        var attribute = attributes[attrIndex];
        updatePropSymbols(attribute);

        currentIndex = 0;
        setTimeout(() => {
            showPopupForIndex(currentIndex, attribute);
        }, 200);
    });

    document.querySelector('#forward').addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % allFeatures.length;

        var attrIndex = parseInt(slider.value);
        var attribute = attributes[attrIndex];

        updatePropSymbols(attribute);

        setTimeout(() => {
            showPopupForIndex(currentIndex, attribute);
        }, 200);
    });

    document.querySelector('#reverse').addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + allFeatures.length) % allFeatures.length;

        var attrIndex = parseInt(slider.value);
        var attribute = attributes[attrIndex];

        updatePropSymbols(attribute);

        setTimeout(() => {
            showPopupForIndex(currentIndex, attribute);
        }, 200);
    });
}

// Step 8: Temporal Legend Control with proportional circles and labels
function createLegend(attributes) {
    var LegendControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'legend-control-container');
            
            // City title placeholder
            container.innerHTML = '<h4 id="legend-city">City Name</h4>';

            // SVG container with default values
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';
            var circles = ["max", "mean", "min"];

            for (var i = 0; i < circles.length; i++) {
                var radius = calcPropRadius(dataStats[circles[i]]);
                var cy = 59 - radius;
                var cx = 30;
                var label = circles[i].charAt(0).toUpperCase() + circles[i].slice(1); // Capitalize

                // Add circle
                svg += `<circle class="legend-circle" id="${circles[i]}" r="${radius}" cy="${cy}" cx="${cx}" />`;
                svg += `<text id="${circles[i]}-text" x="${cx + 40}" y="${cy + 5}">
                            ${label}: ${Math.round(dataStats[circles[i]] * 100) / 100} million
                        </text>`;
            }

            svg += '</svg>';
            container.insertAdjacentHTML('beforeend', svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
}


function updateLegend(attribute, value, cityName) {
    var title = document.getElementById("legend-city");
    if (title) {
        title.innerHTML = cityName;
    }

    var circles = ["max", "mean", "min"];
    circles.forEach(function (key) {
        var radius = calcPropRadius(dataStats[key]);
        var cy = 59 - radius;
        var label = key.charAt(0).toUpperCase() + key.slice(1);

        // Update circle radius and position
        var circle = document.getElementById(key);
        if (circle) {
            circle.setAttribute("r", radius);
            circle.setAttribute("cy", cy);
        }

        // Update label
        var text = document.getElementById(key + "-text");
        if (text) {
            text.setAttribute("y", cy + 5);
            text.textContent = `${label}: ${Math.round(dataStats[key] * 100) / 100} million`;
        }
    });
}

function showPopupForIndex(index, attribute) {
    dataLayer.eachLayer(function(layer) {
        if (layer.feature === allFeatures[index]) {
            layer.openPopup();
            updateLegend(attribute, layer.feature.properties[attribute], layer.feature.properties.City);
        } else {
            layer.closePopup();
        }
    });
}

// Step 2: Load GeoJSON and initialize map features
function getData(map) {
    fetch("data/MegaCities.geojson")
        .then(response => response.json())
        .then(json => {
            allFeatures = json.features;
            calcStats(json); // calculate min, mean, max & set dataStats

            createPropSymbols(json, attributes[0]);
            createSequenceControls(attributes);
            createLegend();

            setTimeout(() => {
                showPopupForIndex(currentIndex, attributes[0]);
            }, 200);
        });
}

document.addEventListener('DOMContentLoaded', createMap);
