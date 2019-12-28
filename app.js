const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require("method-override");
const bodyParser = require("body-parser");

//Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(methodOverride("_method"));

// Mongo URI
const mongoURI = "mongodb+srv://jkolp:Rkdwldns1994@uploads-mrcha.mongodb.net/test?retryWrites=true&w=majority";

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, function(err) {
	if (err) console.log(err);
	else console.log("***** CONGRATZ DB CONNECTION SUCCESS");
});


// Initialize gfs
 let gfs;

 //Initialize stream
 conn.once('open', ()=> {
 	gfs = Grid(conn.db, mongoose.mongo);
 	gfs.collection('uploads');
 })

// Create storage engine
//GridFsStorage is storage object
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});


const upload = multer({ storage }); //Direct connection to mongoDB

// @route GET /
// @desc Loads form
app.get('/', (req, res)=> {
	gfs.files.find().toArray((err, files) => {
		if (!files || files.length ===0) {
			console.log("There is nothing in the stream");
			res.render('index', {files:false});
		} else{
			files.map(file => {
				if (file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
					file.isImage = true;
				}else{
					file.isImage = false;
				}
				if (file.contentType === 'video/mp4' ){
					file.isVideo = true;
				}
				else{
					file.isVideo= false;
				}

			});
			res.render('index', {files:files});
		}
	})
});

// @route POST /upload
// @desc Uploads file to DB
// Blue submit button will post to this
app.post('/upload', upload.single('videoFile'), (req,res)=>{
	console.log("********************Uploaded file information *******************")
	console.log({file: req.file});
	res.redirect('/');
});

// @route DELETE /files/:id
// @desc Delete file
app.delete('/files/:id', (req,res) => {
	gfs.remove({_id:req.params.id, root: 'uploads'}, (err, gridStore) => {
		if (err) 
			return res.status(404).json({ err: err});
		console.log("********** DELETED FILE **********");
		console.log("Filename : " + req.params.filename);
		res.redirect('/');
	});
})

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res)=>{
	gfs.files.find().toArray((err,files)=> {
		// Check if files
		if(!files || files.length === 0){
			return res.status(404).json({
				err: 'No files exist'
			});
		}

		return res.json(files);

	});
})

// @route GET /files/:filename
// @desc Display single file object
app.get('/files/:filename', (req, res)=>{
	gfs.files.findOne({filename: req.params.filename}), (err, file)=>{
				if(!file || file.length === 0){
			return res.status(404).json({
				err: 'No file exist'
			});
		}
		// if file exists
		return res.json(file);
	}
})


// @route GET /video/:filename
// @desc Display video
app.get('/video/:filename', (req, res)=>{
	console.log("Attempting to play the video");
	gfs.files.findOne({filename: req.params.filename}, (err, file)=>{
			if(!file || file.length === 0){
			return res.status(404).json({
				err: 'No file exist'
			});
			}
		console.log("************Displaying the following file *************");
		console.log("File content type : " + file.contentType);
		console.log("File name : " + req.params.filename + "\n\n");

		
		// check if video
		if(file.contentType==='video/mp4'){
			// Read output to browser
			
			if (req.headers['range']) {
				console.log("RANGE")
				/*
            	var parts = req.headers['range'].replace(/bytes=/, "").split("-");
            	var partialstart = parts[0];
            	var partialend = parts[1];

            	var start = parseInt(partialstart, 10);
            	var end = partialend ? parseInt(partialend, 10) : file.length - 1;
            	var chunksize = (end - start) + 1;

           	 	res.writeHead(206, {
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Range': 'bytes ' + start + '-' + end + '/' + file.length,
                'Content-Type': file.contentType
            	});
            	*/
				const readstream = gfs.createReadStream(file.filename, //{range:{
						//startPos: start,
						//endPos: end
						//}
					//}
					);
				readstream.pipe(res);
				}else {

            	res.header('Content-Length', file.length);
            	res.header('Content-Type', file.contentType);

            	console.log("No Range")
            	gfs.createReadStream({
            		_id: file._id
            		}).pipe(res);
       			 }
			
		} else {
			res.status(404).json({
				err: "Not a video"
			})
		}
		
	})
})

// @route GET /image/:filename
// @desc Display image
app.get('/image/:filename', (req, res)=>{
	gfs.files.findOne({filename: req.params.filename}, (err, file)=>{
		if(!file || file.length === 0){
			return res.status(404).json({
			err: 'No file exist'
			});
		}
		console.log("************Displaying the following file *************");
		console.log("File content type : " + file.contentType);
		console.log("File name : " + req.params.filename + "\n\n");
		// check if image
		if(file.contentType==='image/jpeg' || file.contentType === "image/png" ){
			// Read output to browser
			const readstream = gfs.createReadStream(file.filename);
			readstream.pipe(res);
		} else {
			res.status(404).json({
				err: "Not an iamge"
			})
		}
		
	})
})

//For Heroku
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Express Server is Running...");
});
/*
app.listen(port, ()=>{
	console.log("Server started on " + port)

	
})

*/