// Due to the way the data was (multiple types of surveys) I had to group the states and them the features to be able to make the pop ups appear only once per state and
// have the option of a dropdown box to show if they have multiple survey types

var map;
var dataLayer;
var allFeatures = [];
var currentIndex = 0;
var currentYearIndex = 0;
var selectedFeature = null;
var chartInstance = null;
var groupedStates = {};  
var groupedFeatures = [];  
var markers = [];  

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

    L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cmczcgxsj009u01qnc3ee4gke/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
        attribution: '© OpenStreetMap, © Mapbox',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19
    }).addTo(map);

    getData();
}
//We need to call the geoJSON data

function getData() {
    fetch("data/MMR_Coverage_States_NoNaN.geojson")
        .then(response => response.json())
        .then(json => {
            allFeatures = json.features;

// Here is where we group the data based on the values
//first we do it by geography (states)
//then we we use createpropsymbols to group the multiple years to its related survery

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

//Here we create the popups, again we need to make sure that we identify that the states are grouped

function createPropSymbols(attribute) {
    if (dataLayer) map.removeLayer(dataLayer);

    markers = [];

    dataLayer = L.geoJSON({ type: 'FeatureCollection', features: groupedFeatures }, {
        pointToLayer: function (feature, latlng) {
            var stateName = feature.properties.geography;
            var stateSurveys = groupedStates[stateName];

//This variable is how we get the dropdown box to work, we orginize it by the survery type

            var dropdown = `<select id="surveySelector-${stateName}">`;
            stateSurveys.forEach(survey => {
                dropdown += `<option value="${survey.properties.survey_type}">${survey.properties.survey_type}</option>`;
            });
            dropdown += `</select>`;

            var latestYear = attributes[attributes.length - 1];
            var latestSurvey = stateSurveys[0];
            var value = latestSurvey.properties[latestYear];

//This almost destroyed me, I ended up realizing that the geojson data CANNOT have NaN values so I replaced then all with null
//the code here states isNaN but I am too afraid to mess around with it and possibly break it again so I left it

            var popupContent = `
                <b>${stateName}</b><br>
                Survey Type: ${dropdown}
                <div id="popupData-${stateName}">
                    Coverage: ${isNaN(value) ? 'No Data' : (value * 100).toFixed(1) + '%'}<br>
                    Year: ${latestYear}
                </div>
            `;

//These are the markers that are forthe state

            var marker = L.circleMarker(latlng, {
                fillColor: "#5dade2",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                radius: 8
            }).bindPopup(popupContent);

//This makes sure that the popups are only 1 per state again this almost destroyed me
//I kept having multiple popup for the same state, at first I thought I messed up the data but when I went over the excel sheet I realized it was the survey type
//Making it so it will only show one pop up and move to the next state and not just stay on the market woth no pop up due to multiple surveys was a pain
//I used so many youtube tutorials and I also ended up caving and asking chatGPT to review the code to see what was wrong only to realize was grouping the states
//but not the features

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

//These are for the buttons and slider, specifically the HMTL that displays what they look like
//I also added a comment under the slider because when I sent this out for review to some friends they thought the slider was not working
//so the comment helps users to notice the changing data in the popups

function createSequenceControls() {
    var SequenceControl = L.Control.extend({
        options: { position: 'bottomleft' },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'sequence-control-container');
            container.innerHTML = `
                <div class="button-row">
                <button class="step" id="reverse" title="Previous">&#8592;</button>
                <input type="range" class="range-slider" min="0" max="${attributes.length - 1}" value="0" step="1">
                <button class="step" id="forward" title="Next">&#8594;</button>
                <button class="step" id="recenter" title="Recenter">Recenter</button>
                </div>
                <div class="slider-label">Slide to change the year</div>
                `;
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    map.addControl(new SequenceControl());

//this is what makese the buttons and slider actually work

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

    document.getElementById('recenter').addEventListener('click', function () {
    map.setView([37.8, -96], 4, { animate: true });
    });

}

//This is to convert the decimal points to percentages

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

//This is for the legend, due to the data type, I couldnt really make the orginal SVG circles look right, so I opted for a line graph (that honestly I don't really like)
//It displays the data in a more clearer way

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

//This is so that the name of the state shows in the legend

function updateLegendWithState(feature) {
    var ctx = document.getElementById('lineChart').getContext('2d');

    document.getElementById('legend-title').innerHTML = feature.properties.geography + ' MMR Coverage';

//Again converts the decimals into percentages

    var values = attributes.map(year => {
        var val = parseFloat(feature.properties[year]);
        return isNaN(val) ? null : Math.round(val * 100 * 10) / 10;
    });

    if (chartInstance) chartInstance.destroy();

//This is how we added the line graph

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: attributes,
            datasets: [{
                label: feature.properties.geography,
                data: values,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(137, 137, 137, 0.1)',
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

//I wanted to add a pop up before you enter the map so it can explain the purpose

document.addEventListener('DOMContentLoaded', function() {
    var popup = document.getElementById('welcomePopup');
    var closeBtn = document.getElementById('closePopup');

    closeBtn.addEventListener('click', function() {
        popup.style.display = 'none';
    });

    createMap();
});
