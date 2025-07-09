var map = L.map('map').setView([51.505, -0.09], 13);
            L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cm9641e8k003r01qh78je06h6/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
                             '© <a href="https://www.mapbox.com/">Mapbox</a>',
                tileSize: 512,
                zoomOffset: -1,
                maxZoom: 19
}).addTo(map);

            var marker = L.marker([51.5, -0.09]).addTo(map); 
            var circle = L.circle([51.508, -0.11], {
                color: 'pink',
                fillColor: '#ffb3c2',
                fillOpacity: 0.5,
                radius: 500
            }).addTo(map);
            
            var polygon = L.polygon([
                [51.509, -0.08],
                [51.503, -0.06],
                [51.51, -0.047]
            ], {
                color: '#094070',        
                fillColor: '#96ceff',  
                fillOpacity: 0.5 
            }).addTo(map);

            marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
            circle.bindPopup("I am a circle.");
            polygon.bindPopup("I am a polygon.");

            var popup = L.popup();

            function onMapClick(e) {
                popup
                    .setLatLng(e.latlng)
                    .setContent("You clicked the map at " + e.latlng.toString())
                    .openOn(map);
}

    map.on('click', onMapClick);