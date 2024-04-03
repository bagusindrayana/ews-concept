import * as turf from '@turf/turf'
// import polylabel from 'polylabel';

let allPolygon = [];
const installEvent = () => {
    self.addEventListener('install', () => {
        console.log('service worker installed');
    });
};
installEvent();

const activateEvent = () => {
    self.addEventListener('activate', () => {
        console.log('service worker activated');
    });
};
activateEvent();

function checkIntersection(center,size,id) {
    const coordinate = center;

    const radius = size;

    var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
    let highlightIntersectArea = [];
    for (let index = 0; index < allPolygon.length; index++) {
        const polygon = allPolygon[index];
        var intersection = turf.intersect(turf.featureCollection([polygon, buffer]));
        if (intersection) {
            // console.log(intersection);
            highlightIntersectArea.push(intersection);

        }
    }

    self.postMessage({id: id, type: "checkIntersection", area: highlightIntersectArea});
}

function checkHighlightArea(center,size,id) {
    const coordinate = center;
    const radius = size;

    var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
    let highlightSelectedArea = [];
    for (let index = 0; index < allPolygon.length; index++) {
        const polygon = allPolygon[index];
        var intersection = turf.booleanIntersects(polygon, buffer);
        if (intersection) {
            highlightSelectedArea.push(polygon);

        }
    }

    self.postMessage({id: id, type: "checkHighlightArea", area:highlightSelectedArea});
}

function checkMultiHighlightArea(pWaves,sWaves,id) {
    let highlightSelectedArea = [];
    // for (let i = 0; i < pWave.centers.length; i++) {
    //     const coordinate = pWave.centers[i];
    //     const radius = pWave.sizes[i];

    //     var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
        
    //     for (let index = 0; index < allPolygon.length; index++) {
    //         const polygon = allPolygon[index];
    //         polygon.properties.color = "orange";
    //         var intersection = turf.booleanIntersects(polygon, buffer);
    //         if (intersection) {
    //             highlightSelectedArea.push(polygon);

    //         }
    //     }
        
    // }
    
    
    for (let index = 0; index < allPolygon.length; index++) {
        for (let i = 0; i < pWaves.length; i++) {
            const coordinate = pWaves[i].center;
            const radius = pWaves[i].radius;
            if(radius == 0) continue;
    
            var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
            const polygon = allPolygon[index];
            polygon.properties.color = "orange";
            var intersection = turf.booleanIntersects(polygon, buffer);
            if (intersection) {
                highlightSelectedArea.push(polygon);

            }
        }

      

        for (let i = 0; i < sWaves.length; i++) {
            const coordinate = sWaves[i].center;
            const radius = sWaves[i].radius;
            if(radius == 0) continue;
    
            var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
            const polygon = allPolygon[index];
            
           
            var intersection = turf.booleanIntersects(polygon, buffer);
            //var intersection = turf.booleanPointInPolygon(turf.centroid(polygon), buffer);
            if (intersection) {
                highlightSelectedArea.find(e => e.properties.mhid === polygon.properties.mhid).properties.color = "red";
                // else {
                //     polygon.properties.color = "red";
                //     highlightSelectedArea.push(polygon);
                // }
                

            }
            
        }
        
        
    }

    

    //unique highlightSelectedArea
    // highlightSelectedArea = highlightSelectedArea.filter((v,i,a)=>a.findIndex(t=>(t.properties.kabkot_id === v.properties.kabkot_id))===i);
    

    self.postMessage({id: id, type: "checkMultiHighlightArea", area:highlightSelectedArea});
}

self.addEventListener('message', function(ev) {
    
    var data = ev.data;
    if(data.type == "checkIntersection") {
        checkIntersection(data.center,data.size,data.id);
        
    }

    if(data.type == "checkHighlightArea") {
        checkHighlightArea(data.center,data.size,data.id);
        
    }

    if(data.type == "checkMultiHighlightArea") {
        checkMultiHighlightArea(data.pWaves,data.sWaves,data.id);
       
        
    }

    if(data.type == "geoJsonData") {
        const geoJson = data.data;
        for (let index = 0; index < geoJson.features.length; index++) {
            const feature = geoJson.features[index];
            if (!feature.geometry) {
                console.log(feature);
                continue;
            }
            if (feature.geometry.type == 'Polygon') {
                allPolygon.push(turf.polygon(feature.geometry.coordinates, feature.properties))
            } else if (feature.geometry.type == 'MultiPolygon') {
                allPolygon.push(turf.multiPolygon(feature.geometry.coordinates, feature.properties))
            }
        }
        console.log(allPolygon);
        
    }
    


});