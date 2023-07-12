const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if(title && author && email && file) { // if fields are not empty...

      const allowedExtensions = ['.jpg', '.jpeg', '.png']
      const fileExtension = path.extname(file.name).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Invalid file extension. Only JPG, JPEG, and PNG files are allowed.');
      }

      const authorPattern = new RegExp(
        /(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/,
        "g"
      );
      const emailPattern = new RegExp(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "g"
      );
      const titlePattern = new RegExp(
        /(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/,
        "g"
      );

      if (!authorPattern.test(author)) {
        throw new Error('Invalid author');
      }
      if (!emailPattern.test(email)) {
        throw new Error('Invalid email');
      }
      if (!titlePattern.test(title)) {
        throw new Error('Invalid title');
      }

      const maxTitle = title.slice(0, 25); 
      const maxAuthor = author.slice(0, 25)

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const newPhoto = new Photo({ title: maxTitle, author: maxAuthor, email, src: fileName, votes: 0 });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);

    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const clientIp = requestIp.getClientIp(req);
    const existingVote = await Voter.exists({ user: clientIp, votes: req.params.id });

    if (existingVote) {
      return res.status(403).json({ message: 'You have already voted for this photo.' });
    }

    const photoToUpdate = await Photo.findByIdAndUpdate(req.params.id, { $inc: { votes: 1 } });

    if (!photoToUpdate) {
      return res.status(404).json({ message: 'Photo not found.' });
    }

    await Voter.create({ user: clientIp, votes: [req.params.id] });

    return res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json(err);
  }
};