// Full Corrected Script: Fixed Sequence Controls, Dropdown Popups, and Per-State Line Chart

var map;
var dataLayer;
var allFeatures = [];
var currentIndex = 0;
var currentYearIndex = 0;
var selectedFeature = null;
var chartInstance = null;
var groupedStates = {};  // Store all surveys per state
var groupedFeatures = [];  // Store one marker per state
var markers = [];  // Store Leaflet markers

var attributes = [
    "2013-14", "2014-15", "2015-16", "2016-17",
    "2017-18", "2018-19", "2019-20", "2020-21",
    "2021-22", "2022-23", "2023-24"
];

function createMap() {
    map = L.map('map', {
        center: [37.8, -96],
        zoom: 4
    });

    L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cm9641e8k003r01qh78je06h6/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
        attribution: '© OpenStreetMap, © Mapbox',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19
    }).addTo(map);

    getData();
}

function getData() {
    fetch("data/MMR_Coverage_States_NoNaN.geojson")
        .then(response => response.json())
        .then(json => {
            allFeatures = json.features;

            allFeatures.forEach(feature => {
                var stateName = feature.properties.geography;
                if (!groupedStates[stateName]) groupedStates[stateName] = [];
                groupedStates[stateName].push(feature);
            });

            groupedFeatures = Object.keys(groupedStates).map(stateName => groupedStates[stateName][0]);

            selectedFeature = groupedFeatures[0];
            createPropSymbols(attributes[currentYearIndex]);
            createSequenceControls();
            createLegend();
            updateLegendWithState(selectedFeature);
        });
}

function createPropSymbols(attribute) {
    if (dataLayer) map.removeLayer(dataLayer);

    markers = [];

    dataLayer = L.geoJSON({ type: 'FeatureCollection', features: groupedFeatures }, {
        pointToLayer: function (feature, latlng) {
            var stateName = feature.properties.geography;
            var stateSurveys = groupedStates[stateName];

            var dropdown = `<select id="surveySelector-${stateName}">`;
            stateSurveys.forEach(survey => {
                dropdown += `<option value="${survey.properties.survey_type}">${survey.properties.survey_type}</option>`;
            });
            dropdown += `</select>`;

            var latestYear = attributes[attributes.length - 1];
            var latestSurvey = stateSurveys[0];
            var value = latestSurvey.properties[latestYear];

            var popupContent = `
                <b>${stateName}</b><br>
                Survey Type: ${dropdown}
                <div id="popupData-${stateName}">
                    Coverage: ${isNaN(value) ? 'No Data' : (value * 100).toFixed(1) + '%'}<br>
                    Year: ${latestYear}
                </div>
            `;

            var marker = L.circleMarker(latlng, {
                fillColor: "#5dade2",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                radius: 8
            }).bindPopup(popupContent);

            marker.on('popupopen', function() {
                var selector = document.getElementById(`surveySelector-${stateName}`);
                if (selector) {
                    selector.addEventListener('change', function() {
                        var selectedType = this.value;
                        var selectedSurvey = stateSurveys.find(s => s.properties.survey_type === selectedType);
                        var newValue = selectedSurvey.properties[latestYear];

                        document.getElementById(`popupData-${stateName}`).innerHTML = `
                            Coverage: ${isNaN(newValue) ? 'No Data' : (newValue * 100).toFixed(1) + '%'}<br>
                            Year: ${latestYear}
                        `;

                        updateLegendWithState(selectedSurvey);
                    });
                }
            });

            markers.push(marker);
            return marker;
        }
    }).addTo(map);

    showPopupForIndex(currentIndex);
}

function createSequenceControls() {
    var SequenceControl = L.Control.extend({
        options: { position: 'bottomleft' },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'sequence-control-container');
            container.innerHTML = `
                <button class="step" id="reverse"><img src="img/leftflower.png" width="30"></button>
                <input type="range" class="range-slider" min="0" max="${attributes.length - 1}" value="0" step="1">
                <button class="step" id="forward"><img src="img/rightflower.png" width="30"></button>
            `;
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    map.addControl(new SequenceControl());

    document.querySelector('.range-slider').addEventListener('input', function () {
        currentYearIndex = parseInt(this.value);
        updatePropSymbols(attributes[currentYearIndex]);
    });

    document.getElementById('forward').addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % groupedFeatures.length;
        selectedFeature = groupedFeatures[currentIndex];
        updateLegendWithState(selectedFeature);
        showPopupForIndex(currentIndex);
    });

    document.getElementById('reverse').addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + groupedFeatures.length) % groupedFeatures.length;
        selectedFeature = groupedFeatures[currentIndex];
        updateLegendWithState(selectedFeature);
        showPopupForIndex(currentIndex);
    });
}

function updatePropSymbols(attribute) {
    markers.forEach(marker => {
        var stateName = marker.feature.properties.geography;
        var stateSurveys = groupedStates[stateName];
        var value = stateSurveys[0].properties[attribute];

        marker.setRadius(8);

        var popupData = document.getElementById(`popupData-${stateName}`);
        if (popupData) {
            popupData.innerHTML = `Coverage: ${isNaN(value) ? 'No Data' : (value * 100).toFixed(1) + '%'}<br>Year: ${attribute}`;
        }
    });
}

function showPopupForIndex(index) {
    if (!dataLayer) return;

    var layer = markers[index];
    if (layer) {
        map.flyTo(layer.getLatLng(), 5, { animate: true });
        layer.openPopup();
    }
}

function createLegend() {
    var LegendControl = L.Control.extend({
        options: { position: 'bottomright' },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'legend-control-container');
            container.innerHTML = '<h4 id="legend-title">State MMR Coverage</h4><canvas id="lineChart" width="200" height="100"></canvas>';
            return container;
        }
    });

    map.addControl(new LegendControl());
}

function updateLegendWithState(feature) {
    var ctx = document.getElementById('lineChart').getContext('2d');

    var values = attributes.map(year => {
        var val = parseFloat(feature.properties[year]);
        return isNaN(val) ? null : Math.round(val * 100 * 10) / 10;
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: attributes,
            datasets: [{
                label: feature.properties.geography,
                data: values,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Welcome popup

document.addEventListener('DOMContentLoaded', function() {
    var popup = document.getElementById('welcomePopup');
    var closeBtn = document.getElementById('closePopup');

    closeBtn.addEventListener('click', function() {
        popup.style.display = 'none';
    });

    createMap();
});
