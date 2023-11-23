const evn = require("dotenv").config();
const express = require("express");
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { register, login, playGame, getUser, gameUpload, getGameBox } = require("./db.js");
const { jwtMiddleware, convertJWTToJS, sign } = require("./jwt.js");
var cors = require("cors");
const app = express();
const multer = require("multer");
const path = require("path");
const port = 8000;
const bodyParser = require('body-parser');
const fs = require('fs');
const decompress = require("decompress");
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

app.use(cors());

const folderPath = 'public/Build'; // Đường dẫn đến thư mục

app.get('/files', (req, res) => {
});

// app.use(
//   require('cookie-session')({
//     maxAge: 24 * 60 * 60 * 10000,
//     keys: [process.env.SESSION_SECRET]
//   })
// );

app.use(
  express.static(path.join(__dirname, "/public"), {
    setHeaders: function (res, path) {
      if (path.endsWith(".gz")) {
        res.set("Content-Encoding", "gzip");
      }
      if (path.includes("wasm")) {
        res.set("Content-Type", "application/wasm");
      }
    },
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
const sessions = {};
// app.use(passport.initialize());
// app.use(passport.session());
const cookieOptions = {
  httpOnly: true,
  secure: true,
  path: '/'
};

const authorization = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    req.userId = data.id;
    req.userRole = data.role;
    return next();
  } catch {
    return res.sendStatus(403);
  }
};

const generalAccessToken = (data) => {
  const accesstoken = jwt.sign({ data }, process.env.ACCESS_SECRET, { expiresIn: "30m" });
  return accesstoken;
}
const generalRefreshToken = (data) => {
  const refreshtoken = jwt.sign({ data }, process.env.REFRESH_SECRET, { expiresIn: "30d" });
  return refreshtoken;
}

app.post('/api/login', (req, res) => {
  login(req.body.username, req.body.password)
    .then((result) => {
      if (result === true) {
        const accesstoken = generalAccessToken({ username: req.body.username, role: 'user', isLogin: true })
        const refreshtoken = generalRefreshToken({ username: req.body.username, role: 'user' })
        // res.cookie("token", accesstoken,
        //   {
        //     httpOnly: true,
        //   });
        res.set('Set-Cookie', cookie.serialize('token', accesstoken, cookieOptions));
        return res.status(200).json({
          // accesstoken: accesstoken,
          // refreshtoken: refreshtoken
        });
        // return res
        //   .cookie("access_token", accesstoken, {
        //     httpOnly: true,
        //   })
        //   .status(200)

      } else {
        console.log("sai");
        // res.json({ message: 'DangKyThatBai' });
        res.status(400).json({ message: 'DangKyThatBai' });
      }
    })
    .catch((error) => {
      console.error(error);
      res.json({ message: 'DangKyLoi' });
    });
});

// function Auth(req, res, next) {
//   if (req.session.User && req.session.User.islogin) {
//     return next();
//   } else {
//     res.redirect('/login');
//   }
// }

const fileStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/games"); //important this is a direct path fron our current file to storage location
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname);
  },
});


// The Multer Middleware that is passed to routes that will receive income requests with file data (multipart/formdata)
// You can create multiple middleware each with a different storage engine config so save different files in different locations on server
const upload = multer({ storage: fileStorageEngine });

// Single File Route Handler
app.post("/upload/single", upload.single("games"), (req, res) => {
  console.log(req.file);
  decompress(`public/games/${req.file.filename}`, `public/games/unzip/${req.file.filename.replace(".zip", "")}`)
    .then((files) => {
      console.log(files);
      const gameData = JSON.parse(req.body.gameData);
      gameUpload(gameData.gameName, "testuser", uuidv4(), req.file.filename.replace(".zip", "")); // Truyền mảng tên tệp tin vào hàm gameUpload
    })
    .catch((error) => {
      console.log(error);
    });
  res.send("Single FIle upload success");
});

// Multiple Files Route Handler
app.post("/upload/multiple", upload.array("games", 2), (req, res) => {
  console.log(req.file);
  // decompress(`public/games/${req.file.filename}`, `public/games/unzip/${req.file.filename.replace(".zip","")}`)
  // .then((files) => {
  //   console.log(files);
  //   const gameData = JSON.parse(req.body.gameData);
  //   gameUpload(gameData.gameName, "testuser", uuidv4(), req.file.filename.replace(".zip","")); // Truyền mảng tên tệp tin vào hàm gameUpload
  // })
  // .catch((error) => {
  //   console.log(error);
  // });
});



app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/index.html"));
});
app.get('/api/test', (req, res) => {
  res.json({ message: 'I am a message from Server!' });
})
app.post('/api/register', (req, res) => {
  register(req.body.email, req.body.username, req.body.password, req.body.password_repeat)
    .then((result) => {
      if (result === true) {
        res.status(200).json({
          message: "test"
        });
      } else {
        console.log("sai");
        // res.json({ message: 'DangKyThatBai' });
        res.status(400).json({ message: 'DangKyThatBai' });
      }
    })
    .catch((error) => {
      console.error(error);
      res.json({ message: 'DangKyLoi' });
    });
});
// app.get("/login", function (req, res) {
//   res.sendFile(path.join(__dirname, "/login.html"));
// });

app.post('/api/playgame', async (req, res) => {
  try {
    playGame(req.body.gamename)
      .then((result) => {
        return res.json({ gameData: result });
      })
  } catch (error) {
    console.error("Error while playing game:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.get("/main", Auth, function (req, res) {
// res.sendFile(path.join(__dirname, "/public/main.html"));
// });

app.post("/api/getuser", (req, res) => {
  getUser(req.body.username)
    .then((result) => {
      res.status(200).json({
        userData: result
      });
    }).catch((error) => {
      console.error(error);
      res.json({ message: 'DangKyLoi' });
    });
});
app.get("/api/getdata", (req, res) => {
  getGameBox()
    .then((result) => {
      res.status(200).json({
        gameData: result
      });
    }).catch((error) => {
      console.error(error);
      res.json({ message: 'DangKyLoi' });
    });
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});