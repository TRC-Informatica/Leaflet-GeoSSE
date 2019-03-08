'use strict';

var GeoSSE = L.GeoJSON.extend({
    /*
    * Feature Layer class used to handle real-time reloading of
    * geojson layers via server sent events.
    *
    * Extends L.GeoJSON class.
    */
    connectToEventServer: function( featureIdField, channelName=null){
        /*
        * Establishes connection to the event server
        * and subscribes to the event stream, optionally on channelName.
        *
        * Keyword Arguments:
        * featureIdField (required) - used to identify the feature to update/
        * replace on update events or delete.
        * channelName (optional) - The channel of the event server to subscribe to.
        * If no channelName is provided, then auto subscribe to events not published
        * to a specific channel.
        */

        let cls=this;

        // set stream source
        let sourceUrl
        if (channelName !== null){
            sourceUrl = `${this.options.url}?channel=${channelName}`
        } else {
            sourceUrl = `${this.options.url}`
        }
        let source = new EventSource(sourceUrl);

        source.addEventListener('create', function createEvent(event) {
            /*
            * On create events, simply add the data. The expected data sent by this event is a 
            * geojson feature.
            */
            let geojson = JSON.parse(event.data);
            cls.addData(geojson);
        }, false);

        source.addEventListener('update', function updateEvent(event) {
            /*
            * On update events, replace the existing feature based on featureId. The expected data sent by  
            * this event is a single geojson feature.
            */
            let geojson = JSON.parse(event.data);
            for (let l of cls.getLayers()){
                if (l.feature.properties[featureIdField] === geojson.properties[featureIdField]){
                    cls.removeLayer(l);
                    cls.addData(geojson);
                }
            }
        }, false);

        source.addEventListener('delete', function deleteEvent(event) {
            /*
            * On delete events, remove the existing feature based on featureId. The expected data sent by  
            * this event is a single geojson feature.
            */
            let geojson = JSON.parse(event.data);
            for (let l of cls.getLayers()){
                if (l.feature.properties[featureIdField] === geojson.properties[featureIdField]){
                    cls.removeLayer(l);
                }
            }
        }, false);

        // handle connection open event
        source.onopen = function(event){
            /*
            * Fired once when readyState changes from 0 (CONNECTING)
            * to 1 (CONNECTED). DOES NOT fire when the connection is
            * first established, actually fires when the first event
            * is received from server.
            *
            * DO NOT use 'onopen' event to test/confirm
            * successful connection to the event server. Instead make a
            * request to the event server and have it publish a
            * type='message' event. Then use source.onmessage to confirm you
            * successfully got the event (this method only works on Firefox).
            * Alternatively check source.readyState.
            */
        }

        // handle message event
        source.onmessage = function(event){
            /*
            * Generic 'message' event handler.
            * Can use this to confirm connection to event server
            * by making GET request to end point that publishes
            * a type='message' event.
            */

            //let data = JSON.parse(event.data);
            //alert(data.message);
        }

        // handle error event
        source.onerror = function(event){
            // reconnect if the connection is closed
            if (source.readyState === 2){
                cls.connectToEventServer(channelName, featureIdField);
            }
            console.log(event.data);
        }

        this.eventSource = source;
    },
    disconnect: function(){
        /*
        * Disconnect from the event server and unsubscribe from all channels.
        */
        this.eventSource.close();
    }
});

// factory function
L.geoSSE = function (data, options){
    return new GeoSSE(data, options);
}