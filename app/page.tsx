'use client'
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import './ui.css';
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client'
import Worker from 'web-worker';
import TitikGempa from './components/mapbox_marker/titik_gempa';
import GempaBumiAlert from './components/GempaBumiAlert';
import * as turf from '@turf/turf'
import Card from './components/card/card';
import { createRoot } from 'react-dom/client';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import ItemKotaTerdampak from './components/ItemKotaTerdampak';
import { KotaTerdampak, InfoGempa } from "../libs/interface";


mapboxgl.accessToken = 'pk.eyJ1IjoiYmFndXNpbmRyYXlhbmEiLCJhIjoiY2p0dHMxN2ZhMWV5bjRlbnNwdGY4MHFuNSJ9.0j5UAU7dprNjZrouWnoJyg';



let socket;
export default function Home() {
  const dangerSound = "/sounds/siren-alarm-96503.mp3"
  const smallEarthQuakeSound = "/sounds/wrong-answer-129254.mp3"
  const mapContainer = useRef<HTMLDivElement | null>(null); // Update the type of mapContainer ref
  const map = useRef<mapboxgl.Map | null>(null); // Update the type of the map ref
  const [lng, setLng] = useState(116.1153781);
  const [lat, setLat] = useState(0.146658);
  const [zoom, setZoom] = useState(5);

  const geoJsonData = useRef<any>(null);
  const worker = useRef<Worker | null>(null);


  const adaGempa = useRef<boolean>(false);
  // const [titikGempas, setTitikGempas] = useState<TitikGempa[]>([]);

  const tgs = useRef<TitikGempa[]>([]);
  const [alertGempaBumis, setAlertGempaBumis] = useState<InfoGempa[]>([]);
  const [infoGempas, setInfoGempas] = useState<InfoGempa[]>([]);
  const [stackAlerts, setStackAlerts] = useState<InfoGempa[]>([]);
  const sas = useRef<InfoGempa[]>([]);
  const [detailInfoGempa, setDetailInfoGempa] = useState<InfoGempa | null>(null);

  const [kotaTerdampak, setKotaTerdampak] = useState<KotaTerdampak[]>([]);
  const kts = useRef<KotaTerdampak[]>([]);

  const igs = useRef<InfoGempa[]>([]);
  const markerDaerahs = useRef<any[]>([]);

  const lastGempaId = useRef<string>('');
  const lastGempaKecilId = useRef<string>('');

  const titikGempaKecil = useRef<TitikGempa | null>(null);


  const warningHandler = async (data: any) => {
    const time = new Date().toLocaleTimeString();
    const id = data.id ?? `tg-${time}`;
    const nig: InfoGempa = {
      id: id,
      lng: parseFloat(data.lng),
      lat: parseFloat(data.lat),
      mag: data.mag || 9.0,
      depth: data.depth || "10 Km",
      message: data.message,
      place: data.place,
      time: new Date().toLocaleString()
    };

    igs.current.unshift(nig);
    const audioDangerElement = document.getElementById('danger');
    setTimeout(() => {

      if (audioDangerElement) {
        (audioDangerElement as HTMLAudioElement).play();
      }
    }, 2000);

    // setAlertGempaBumis([...alertGempaBumis, nig]);
    // //add data to first infoGempas
    // setInfoGempas(igs.current);

    setAlertGempaBumis([...alertGempaBumis, nig]);
    //add data to first infoGempas
    setInfoGempas([nig, ...infoGempas]);
    await new Promise(r => setTimeout(r, 6000));
    if (audioDangerElement) {
      //set volume down
      (audioDangerElement as HTMLAudioElement).volume = 0.5;
    }

    if (!map.current) return;
    map.current.flyTo({
      center: [data.lng, data.lat],
      zoom: 7,
      essential: true
    });

    const tg = new TitikGempa(id, {
      coordinates: [data.lng, data.lat],
      pWaveSpeed: 6000,
      sWaveSpeed: 3000,
      map: map.current!,
      description: data.message,
      mag: data.mag || 9.0,
      depth: data.depth || "10 Km",
    });

    tgs.current.push(tg);

    if (worker.current != null) {
      adaGempa.current = true;
      sendWave();
    }

    await new Promise(r => setTimeout(r, 4000));
    //setStackAlerts([...stackAlerts, data]);
  }

  const socketInitializer = () => {
    if (socket != null) return;
    fetch('/api/socket')
      .then(() => {
        console.log('Socket is initializing');
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  };

  const initWorker = () => {
    worker.current = new Worker(
      new URL('./worker.mjs', import.meta.url),
      { type: 'module' }
    );

    worker.current.postMessage({ type: 'geoJsonData', data: geoJsonData.current });

    worker.current.addEventListener('message', (event: any) => {
      const data = event.data;
      // if (data.type == "checkMultiHighlightArea" && data.id == "s-wave") {
      //   recieveSWave(data);
      // }

      // if (data.type == "checkMultiHighlightArea" && data.id == "p-wave") {
      //   recievePWave(data);
      // }

      if (data.type == "checkMultiHighlightArea" && data.id == "wave") {
        recieveWave(data);
      }
    });
  }

  const loadGeoJsonData = () => {
    fetch('/all_kabkota_ind.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonData.current = data;
        map.current!.on('load', () => {
          map.current!.addSource('wilayah', {
            type: 'geojson',
            generateId: true,
            data: data
          });
          map.current!.addLayer({
            'id': 'outline',
            'type': 'line',
            'source': 'wilayah',
            'layout': {},
            'paint': {
              'line-color': '#807a72',
              'line-width': 1
            }
          });
        });


        initWorker();

      }).catch(error => console.error('Error fetching data:', error));
  };


  useEffect(() => {
    socketInitializer();

    socket = io();

    socket.on('connect', () => {
      console.log('connected');
    });
    socket.on('warning', (v: any) => {

      warningHandler(v);
    });

    if (map.current) return () => {
      socket!.disconnect();
    };

    // (document.getElementById("error") as HTMLAudioElement).volume = 0.5;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
    });

    loadGeoJsonData();
    getTitikGempaJson();
    getGempa();
    return () => {
      socket!.disconnect();
    }


  }, [alertGempaBumis, infoGempas, stackAlerts]);



  const sendWave = () => {
    // const pWaves = tgs.current.map((v: TitikGempa) => {
    //   return {
    //     id: v.id,
    //     center: v.center,
    //     radius: v.pWaveRadius
    //   }
    // });
    // const sWaves = tgs.current.map((v: TitikGempa) => {
    //   return {
    //     id: v.id,
    //     center: v.center,
    //     radius: v.sWaveRadius
    //   }
    // });

    const t = tgs.current.map((v: TitikGempa) => {
      return {
        id: v.id,
        center: v.center,
        mag: v.mag,
        depth: v.depth,
        pWaveRadius: v.pWaveRadius,
        sWaveRadius: v.sWaveRadius,
        areaTerdampak: [],
        message: v.description
      }
    });
    worker.current!.postMessage({ type: 'checkMultiHighlightArea', titikGempa: t, id: "wave" });
  }


  const isEqual = (a, b) => a.id === b.id && a.name === b.name;


  const recieveWave = async (data: any) => {
    let alerts: InfoGempa[] = [];
    for (let x = 0; x < data.titikGempa.length; x++) {
      const tg = data.titikGempa[x];

      const nig: InfoGempa = {
        id: tg.id,
        lng: parseFloat(tg.center[1]),
        lat: parseFloat(tg.center[0]),
        mag: tg.mag,
        depth: tg.depth,
        message: tg.message,
        place: tg.place,
        time: new Date().toLocaleString(),
        listKotaTerdampak: []
      };

      for (let il = 0; il < tg.areaTerdampak.length; il++) {
        const at = tg.areaTerdampak[il];
        const dist = turf.distance(turf.point([tg.center[0], tg.center[1]]), turf.point([at.center[0], at.center[1]])) - (tg.sWaveRadius / 1000);
        const time = Math.floor(dist / 3) * 1000;
        nig.listKotaTerdampak!.push({
          lng: at.center[1],
          lat: at.center[0],
          distance: dist,
          name: at.alt_name,
          hit: at.hit,
          timeArrival: new Date(new Date().getTime() + time)
        });

      }

      //sort nig.listKotaTerdampak by distance
      nig.listKotaTerdampak!.sort((a, b) => a.distance - b.distance);

      alerts.push(nig);
    }

    // setInfoGempas(igs.current);
    // sas.current = alerts;
    setStackAlerts(alerts);

    const areas = data.area;

    // Hapus data array objek yang sama
    const uniqueData = areas.filter((obj, index, self) =>
      index === self.findIndex((t) => isEqual(t.properties, obj.properties))
    );

    for (let x = 0; x < uniqueData.length; x++) {
      const element = uniqueData[x];
      const p: number[] = turf.centroid(element).geometry.coordinates;
      if (markerDaerahs.current.findIndex((el) => el[0] == p[0] && el[1] == p[1]) == -1) {
        markerDaerahs.current.push([p[0], p[1]]);
        const markerParent = document.createElement('div');
        const markerEl = document.createElement('div');
        markerEl.innerHTML = '<p class="uppercase">' + element.properties.alt_name + '</p>';
        markerEl.classList.add('marker-daerah');
        markerEl.classList.add('show-pop-up');
        markerParent.appendChild(markerEl);
        new mapboxgl.Marker(markerParent)
          .setLngLat([p[0], p[1]])
          .addTo(map.current!)
        // const dist = turf.distance(turf.point([p[0], p[1]]), turf.point([element.properties.titikGempa[0], element.properties.titikGempa[1]]));
        // const time = Math.floor(dist / 3) * 1000;
        // kts.current.push({
        //   lng: p[0],
        //   lat: p[1],
        //   distance: dist,
        //   name: element.properties.alt_name,
        //   hit: false,
        //   timeArrival: new Date(new Date().getTime() + time)
        // });
        // setKotaTerdampak([...kotaTerdampak, ...kts.current]);
        // countdownTime();




        //animate scroll down for .list-daerah
        // const listDaerah = document.querySelector('.list-daerah .card-content');
        // await new Promise(r => setTimeout(r, 100));
        // if (listDaerah) {
        //   listDaerah.scrollTop = listDaerah.scrollHeight;
        // }
        // if(element.properties.hit){
        //   (document.getElementById("error") as HTMLAudioElement).play();
        // }
      } else {

        const index = kts.current.findIndex((el) => el.lng == p[0] && el.lat == p[1]);
        if (index != -1) {

          // kts.current[index].distance += 16;
          // kts.current[index].hit = element.properties.hit;
          // setKotaTerdampak([...kotaTerdampak, ...kts.current]);
          // countdownTime();
        }
      }

      // let alerts: InfoGempa[] = [];
      // if (element.properties.titikGempa) {
      //   for (let x = 0; x < element.properties.titikGempa.length; x++) {
      //     const tg = element.properties.titikGempa[x];
      //     const cek = igs.current.find((el) => el.id == tg.id);
      //     if (cek) {
      //       if (!cek.listKotaTerdampak) {
      //         cek.listKotaTerdampak = [];
      //       }

      //       const cek_kota = cek.listKotaTerdampak.find((el) => el.lng == p[0] && el.lat == p[1]);
      //       if (!cek_kota) {
      //         const dist = turf.distance(turf.point([p[0], p[1]]), turf.point([tg.center[0], tg.center[1]])) - (tg.radius / 1000);
      //         const time = Math.floor(dist / 3) * 1000;
      //         cek.listKotaTerdampak.push({
      //           lng: p[0],
      //           lat: p[1],
      //           distance: dist,
      //           name: element.properties.alt_name,
      //           hit: element.properties.hit,
      //           timeArrival: new Date(new Date().getTime() + time)
      //         });
      //       } else {
      //         cek_kota.hit = element.properties.hit;
      //       }
      //       alerts.push(cek);
      //     }
      //   }
      // }
      // console.log(element.properties.titikGempa.length);

      // // setInfoGempas(igs.current);
      // // sas.current = alerts;
      // setStackAlerts(alerts);


    }

    if (map.current!.getSource('hightlight-wave')) {
      (map.current!.getSource('hightlight-wave') as mapboxgl.GeoJSONSource).setData({ "type": "FeatureCollection", "features": uniqueData });
    } else {
      map.current!.addSource('hightlight-wave', {
        'type': 'geojson',
        'data': { "type": "FeatureCollection", "features": uniqueData }
      });
    }

    if (!map.current!.getLayer('hightlight-wave-layer')) {
      map.current!.addLayer({
        'id': 'hightlight-wave-layer',
        'type': 'fill',
        'source': 'hightlight-wave',
        'layout': {},
        'paint': {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.8
        }
      });

      map.current!.moveLayer('outline');
      for (let tg of tgs.current) {
        map.current!.moveLayer(tg.id);
      }
    }

    sendWave();
  }

  function getTitikGempaJson() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json";
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        map.current!.on('load', () => {
          let ifg: InfoGempa[] = [];
          for (let index = 0; index < data.features.length; index++) {
            const feature = data.features[index];
            ifg.push({
              id: feature.properties.id,
              lng: feature.geometry.coordinates[0],
              lat: feature.geometry.coordinates[1],
              mag: feature.properties.mag,
              depth: feature.properties.depth,
              place: feature.properties.place,
              time: feature.properties.time
            });
          }
          igs.current = ifg;
          setInfoGempas(ifg);

          //check earthquakes layer
          if (map.current!.getLayer('earthquakes-layer')) {
            //update source
            (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(url);
          } else {
            //add source
            map.current!.addSource('earthquakes', {
              type: 'geojson',
              data: data
            });

            map.current!.addLayer({
              'id': 'earthquakes-layer',
              'type': 'circle',
              'source': 'earthquakes',
              'paint': {
                'circle-radius': ["to-number", ['get', 'mag']],
                'circle-stroke-width': 2,

                'circle-color': [
                  "case",
                  //depth <= 50 red, depth <= 100 orange, depth <= 250 yellow, depth <= 600 green, depth > 600 blue
                  ['<=', ["to-number", ['get', 'depth']], 50],
                  "red",
                  ['<=', ["to-number", ['get', 'depth']], 100],
                  "orange",
                  ['<=', ["to-number", ['get', 'depth']], 250],
                  "yellow",
                  ['<=', ["to-number", ['get', 'depth']], 600],
                  "green",
                  "blue",
                ],
                'circle-stroke-color': 'white'
              }
            });
          }

          map.current!.on('click', 'earthquakes-layer', (e: any) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const d = e.features[0].properties;
            const placeholder = document.createElement('div');
            const root = createRoot(placeholder)
            root.render(<Card title={
              <div className='overflow-hidden'>
                <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                  <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
                </div>
              </div>
            } className='min-h-48 min-w-48 whitespace-pre-wrap' >
              <ul>
                <li>
                  Magnitudo : {d.mag}
                </li>
                <li>
                  Kedalaman : {d.depth}
                </li>
                <li>
                  Waktu : {new Date(d.time!).toLocaleString()}
                </li>
                <li>
                  Lokasi (Lat,Lng) : <br />{coordinates[0]} , {coordinates[1]}
                </li>
              </ul>
            </Card>);

            new AnimatedPopup({
              openingAnimation: {
                duration: 100,
                easing: 'easeOutSine',
                transform: 'scale'
              },
              closingAnimation: {
                duration: 100,
                easing: 'easeInOutSine',
                transform: 'scale'
              }
            }).setDOMContent(placeholder).setLngLat(coordinates).addTo(map.current!);
          });

          map.current!.on('mouseenter', 'earthquakes-layer', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
          });

          // Change it back to a pointer when it leaves.
          map.current!.on('mouseleave', 'earthquakes-layer', () => {
            map.current!.getCanvas().style.cursor = '';
          });

        });
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });

  }

  function getGempa() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json";
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        const coordinates = data.info.point.coordinates.split(",");
        lastGempaId.current = data.identifier;
        const sentTime = new Date(data.sent.replace("WIB", ""));
        const currentTime = new Date();
        //if sent time is less than 5 minutes
        if ((currentTime.getTime() - sentTime.getTime()) < 300000) {

          warningHandler({
            id: data.identifier,
            lng: parseFloat(coordinates[0]),
            lat: parseFloat(coordinates[1]),
            mag: parseFloat(data.info.magnitude),
            depth: data.info.depth,
            message: data.info.description + "\n" + data.info.instruction
          });

        }
        // getGempaPeriodik();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });

    const url2 = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json";
    fetch(url2)
      .then(response => response.json())
      .then((data) => {
        if (data.features.length > 0) {
          const feature = data.features[0];
          lastGempaKecilId.current = feature.properties.id;

          const sentTime = new Date(feature.properties.time);
          const currentTime = new Date();
          //if sent time is less than 5 minutes
          if ((currentTime.getTime() - sentTime.getTime()) < 300000) {
            var notif = new Audio(smallEarthQuakeSound);
            notif.play();
            if (map.current) {
              map.current.on('load', function () {
                map.current!.flyTo({
                  center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
                  zoom: 7,
                  essential: true
                });
                const msg = `${feature.properties.place}
Magnitudo : ${feature.properties.mag}
Kedalaman : ${feature.properties.depth}
Lokasi (Lat,Lng) : 
${feature.geometry.coordinates[0]} , ${feature.geometry.coordinates[1]}
                `
                const tg = new TitikGempa(lastGempaKecilId.current, {
                  coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
                  pWaveSpeed: 6000,
                  sWaveSpeed: 3000,
                  map: map.current!,
                  description: msg,
                  mag: parseFloat(feature.properties.mag) || 9.0,
                  depth: feature.properties.depth || "10 Km",
                });

                if (titikGempaKecil.current) {
                  titikGempaKecil.current.removeAllRender();
                }
                titikGempaKecil.current = tg;
                // setTitikGempaKecil(tg);
              });
            }


          }

        }
        getGempaPeriodik();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  }

  function getGempaPeriodik() {
    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json"
      //await fetch
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          if (lastGempaId.current != data.identifier) {
            lastGempaId.current = data.identifier;
            const coordinates = data.info.point.coordinates.split(",");

            // const nig: InfoGempa = {
            //   lng: parseFloat(coordinates[0]),
            //   lat: parseFloat(coordinates[1]),
            //   mag: parseFloat(data.info.magnitude),
            //   depth: data.info.depth,
            //   message: data.info.description + "\n" + data.info.instruction,
            //   place: data.info.place,
            //   time: new Date().toLocaleString()
            // };

            // igs.current.unshift(nig);

            // setAlertGempaBumis([...alertGempaBumis, nig]);
            // //add data to first infoGempas
            // setInfoGempas(igs.current);
            warningHandler({
              id: data.identifier,
              lng: parseFloat(coordinates[0]),
              lat: parseFloat(coordinates[1]),
              mag: parseFloat(data.info.magnitude),
              depth: data.info.depth,
              message: data.info.description + "\n" + data.info.instruction
            });

          }
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);

    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json";
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          const feature = data.features[0];
          if (lastGempaKecilId.current != feature.properties.id) {
            lastGempaKecilId.current = feature.properties.id;
            var notif = new Audio(smallEarthQuakeSound);
            notif.play();
            if (!map.current) return;
            map.current.flyTo({
              center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
              zoom: 7,
              essential: true
            });

            const tg = new TitikGempa(lastGempaKecilId.current, {
              coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
              pWaveSpeed: 6000,
              sWaveSpeed: 3000,
              map: map.current!,
              description: feature.properties.place,
              mag: Number(feature.properties.mag) || 9.0,
              depth: feature.properties.depth || "10 Km",
            });

            if (titikGempaKecil.current) {
              titikGempaKecil.current.removeAllRender();
            }
            titikGempaKecil.current = tg;
            // setTitikGempaKecil(tg);
          }
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);
  }

  const selectedPopup = useRef<any>(null);
  function selectEvent(d: InfoGempa) {
    setDetailInfoGempa(d);
    if (selectedPopup.current) {
      selectedPopup.current.remove();
    }
    map.current!.flyTo({
      center: [d.lng, d.lat],
      zoom: 7,
      essential: true
    });
    const placeholder = document.createElement('div');
    const root = createRoot(placeholder)
    root.render(<Card title={
      <div className='overflow-hidden'>
        <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
        <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
          <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
        </div>
      </div>
    } className='min-h-48 min-w-48 whitespace-pre-wrap ' >
      <ul >
        <li>
          Magnitudo : {d.mag}
        </li>
        <li>
          Kedalaman : {d.depth}
        </li>
        <li>
          Waktu : {new Date(d.time!).toLocaleString()}
        </li>
        <li>
          Lokasi (Lat,Lng) : <br />{d.lat} , {d.lng}
        </li>
      </ul>
    </Card>);

    selectedPopup.current = new AnimatedPopup({
      closeOnClick: false,
      openingAnimation: {
        duration: 100,
        easing: 'easeOutSine',
        transform: 'scale'
      },
      closingAnimation: {
        duration: 100,
        easing: 'easeInOutSine',
        transform: 'scale'
      }
    }).setDOMContent(placeholder).setLngLat([d.lng, d.lat]).addTo(map.current!);
  }

  // function countdownTime() {
  //   const timeCuntdownElement = document.querySelectorAll('.time-countdown');
  //   //loop and countdon in milisecond on data-time
  //   timeCuntdownElement.forEach((v) => {
  //     const time = parseInt(v.getAttribute('data-time')!);
  //     let milisecond = time;
  //     //format minute : second : milisecond
  //     const interval = setInterval(() => {
  //       const seconds = Math.floor(milisecond / 1000);
  //       const minutes = Math.floor(seconds / 60);
  //       const remainingSeconds = seconds % 60;
  //       const remainingMilliseconds = milisecond % 1000;
  //       v.innerHTML = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}:${remainingMilliseconds.toString().padStart(2, '0')}`;
  //       milisecond -= 10;
  //       if (milisecond < 0) {
  //         clearInterval(interval);
  //       }
  //     }, 10);

  //     v.classList.remove('time-countdown');
  //   });

  // }



  return (
    <div>
      <audio id="danger" className='hidden'>
        <source src={dangerSound} type="audio/mp3" />
      </audio>
      {/* <audio id="error" className='hidden'>
        <source src={errorSound} type="audio/mp3" />
      </audio> */}
      <div ref={mapContainer} className="w-full h-screen" />
      {/* <GempaBumiAlert
           
            props={
              {
                magnitudo: 9.0,
                kedalaman: '10 km',
                show: true,
              }
            } /> */}
      <div className="flex fixed left-6 top-6">
        {stackAlerts.map((v, i) => {
          return <div key={i} className='w-1/5'><Card title={
            <div className='overflow-hidden'>
              <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
              <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
              </div>
            </div>
          } className='show-pop-up'>
            <p className='whitespace-pre-wrap text-glow'>{v.message}</p>
            <Card className='list-daerah mt-4'>
              <ul>
                {v.listKotaTerdampak && v.listKotaTerdampak.map((kota, i) => {
                  if (kota.hit) {
                    return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah danger show-pop-up'>
                      <ItemKotaTerdampak kota={kota} />
                    </li>
                  } else {
                    return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah show-pop-up'>
                      <ItemKotaTerdampak kota={kota} />
                    </li>
                  }
                })}
              </ul>
            </Card>
          </Card></div>
        })}

        {/* <Card title={
          <div className='overflow-hidden'>
            <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
            <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
              <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
            </div>
          </div>
        } className='show-pop-up'>
          <p className='whitespace-pre-wrap'>Gempa Bumi 1</p>
          <Card className='list-daerah mt-4'>
            <ul >
              <li className='flex flex-grow justify-between items-center mb-2 item-daerah danger'>
                <ItemKotaTerdampak kota={{
                  lat: 0.146658,
                  lng: 116.1153781,
                  distance: 10,
                  hit: true,
                  name: "Kota 1",
                  timeArrival: new Date()
                }} />
              </li>
              <li className='flex flex-grow justify-between items-center mb-2 item-daerah danger'>
                <ItemKotaTerdampak kota={{
                  lat: 0.146658,
                  lng: 116.1153781,
                  distance: 10,
                  hit: true,
                  name: "Kota 2",
                  timeArrival: new Date()
                }} />
              </li>
            </ul>
          </Card>
        </Card> */}

      </div>

      {/* {kotaTerdampak.length > 0 && <Card title={
        <p className='font-bold text-glow-red' style={{
          color: "red"
        }}>KOTA TERDAMPAK</p>
      } className='show-pop-up fixed left-6 bottom-6 card-float w-1/2 md:w-1/4 list-daerah'>
        <ul>
          {kotaTerdampak.map((v, i) => {
            if (v.hit) {
              return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah danger'>
                <ItemKotaTerdampak kota={v} />
              </li>
            } else {
              return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah'>
                <ItemKotaTerdampak kota={v} />
              </li>
            }
          })}

        </ul>
      </Card>} */}




      <Card title={
        <p className='font-bold text-glow-red text-sm' style={{
          color: "red"
        }}>EVENT LOG</p>
      } footer={
        <p className='font-bold text-glow-red'>

        </p>
      } className=' fixed right-6 top-6 card-float w-1/2 md:w-1/5'>
        <ul >
          {infoGempas.map((v: InfoGempa, i) => {
            let readAbleTime = v.time;
            //convert 2024-04-03 05:45:04.621973 to d/m/Y H:i:s
            if (v.time) {
              const date = new Date(v.time);
              readAbleTime = date.toLocaleString('id-ID');
            }



            return <li key={i}
              onClick={() => {
                selectEvent(v);

              }}
              className='flex flex-col mb-2 list-event cursor-pointer  show-pop-up'>
              <span className='block mb-1' style={{
                fontSize: "11px"
              }}>{readAbleTime}</span>
              <div className=' bordered p-2' style={{
                fontSize: "12px"
              }}>
                {Number(v.mag).toFixed(2)} M - {v.place || "uknown"}
              </div>
            </li>
          })}
        </ul>

      </Card>

      {detailInfoGempa && <Card title={
        <div className='w-full flex justify-between'>
          <p className='font-bold text-glow-red'>
            DETAIL EVENT
          </p>
          <button onClick={() => {
            if (selectedPopup.current) {
              selectedPopup.current.remove();
            }
            setDetailInfoGempa(null);
          }}>X</button>
        </div>
      }
        footer={
          <p className='font-bold text-glow-red'>

          </p>
        }
        className='show-pop-up fixed right-6 bottom-6  card-float w-1/2 md:w-1/4'>
        <ul >
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              TIME : {detailInfoGempa.time}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              MAGNITUDE : {Number(detailInfoGempa.mag).toFixed(2)} M
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              DEPTH : {Number(detailInfoGempa.depth).toFixed(2)} KM
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              PLACE : {detailInfoGempa.place}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              LATITUDE : {detailInfoGempa.lat}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              LONGITUDE : {detailInfoGempa.lng}
            </div>
          </li>


        </ul>
      </Card>}

      {alertGempaBumis.map((v, i) => {
        return <div className='z-50' key={i}>
          <GempaBumiAlert
            key={i}
            props={
              {
                magnitudo: v.mag || 9.0,
                kedalaman: v.depth || '0 km',
                show: true,
                closeInSecond: 5
              }
            } />
        </div>
      })}
    </div>

  );
}
