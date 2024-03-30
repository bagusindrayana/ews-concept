import * as turf from '@turf/turf'
import polylabel from 'polylabel';


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

function checkIntersection(allPolygon,center,size,id) {
    const coordinate = center;

    const radius = size;

    var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
    let highlightIntersectArea = [];
    let highlightSelectedArea = [];
    for (let index = 0; index < allPolygon.length; index++) {
        const polygon = allPolygon[index];
        var intersection = turf.intersect(polygon, buffer);
        if (intersection) {
            // console.log(intersection);
            highlightIntersectArea.push(intersection);
            highlightSelectedArea.push(polygon);

        }
    }

    self.postMessage({id: id, type: "checkIntersection", highlightIntersectArea: highlightIntersectArea,highlightSelectedArea:highlightSelectedArea});
}

self.addEventListener('message', function(ev) {
    var data = ev.data;
    if(data.type == "checkIntersection") {
        checkIntersection(data.allPolygon,data.center,data.size,data.id);
        
    }
    


});