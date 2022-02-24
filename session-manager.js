const fs = require('fs');
const path = require('path');

const { DateTime } = require('luxon');
const onFinished = require('on-finished');
const uuid = require('uuid');

module.exports = function (sessionDir) {
  if (!sessionDir) {
    sessionDir = './sessions';
  }

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir);
  }

  return function sessionManager(req, res, next) {
    let sessionId = req.cookies._s;
    if (sessionId === '' || sessionId === undefined) {
      sessionId = uuid.v4();
      res.cookie('_s', sessionId, { httpOnly: true });
    }

    const sessionFile = path.join(sessionDir, sessionId);
    fs.readFile(sessionFile, 'utf8', function (err, data) {
      req.session = Object.create(null);

      onFinished(res, function (err) {
        const content = [];
        for (key in req.session) {
          content.push(key + '=' + JSON.stringify(req.session[key]));
        }
        fs.writeFile(sessionFile, content.join('\n'), 'utf8', function (err) {
          if (err) {
            // do something here?
          }
        });
      });

      if (err || !data) {
        return next();
      }

      const lines = data.split('\n');
      for (line of lines) {
        if (line === undefined) continue;
        const comps = line.split('=');
        try {
        req.session[comps[0]] = JSON.parse(comps[1]);
        } catch (e) {
          continue;
        }
      }

      next();
    });
  };
}
