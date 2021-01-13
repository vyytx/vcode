var express = require('express');
var app = express();
const ngrok = require('ngrok');

app.use(express.static('public'));

app.get("/" ,function(req, res){
    // if(req.params.id != ""){
    //     res.sendFile(__dirname + `/${req.params.id}.html`);
	// }
	res.sendFile(__dirname + "/public/view/index.html");
});

app.listen(3000, function(){
    console.log("runs at *:3000");
    (async function() {
        const url = await ngrok.connect(3000);
        const apiUrl = ngrok.getUrl();
        console.log("runs at: " + apiUrl + ", " + url);
	})();
});