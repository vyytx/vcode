var express = require('express');
var app = express();

app.use(express.static('public'));

app.get("/" ,function(req, res){
    // if(req.params.id != ""){
    //     res.sendFile(__dirname + `/${req.params.id}.html`);
	// }
	res.sendFile(__dirname + "/public/view/index.html");
});

app.listen(3000, function(){
    console.log("runs at *:3000");
});