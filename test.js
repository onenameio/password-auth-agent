var test = require('tape')

var PasswordAuthAgent = require('./index')

test('PasswordAuthAgent', function(t) {
    t.plan(1)

    var credential = {
        username: 'username',
        password: 'password'
    }

    var passwordAuthAgent = new PasswordAuthAgent(credential)
    t.ok(passwordAuthAgent)
})
