'use strict'

var getInputWithName = require('./utils').getInputWithName,
    getloginFormSummaryFromElement = require('./utils').getloginFormSummaryFromElement,
    getMostLikelyFormElementOnPage = require('./utils').getMostLikelyFormElementOnPage,
    getLoginFormSummaryFromSiteConfig = require('./utils').getLoginFormSummaryFromSiteConfig,
    getLoginFormOnPage = require('./utils').getLoginFormOnPage,
    pageHasALoginForm = require('./utils').pageHasALoginForm,
    getElementsIndicatingUserIsLoggedIn = require('./utils').getElementsIndicatingUserIsLoggedIn

function PasswordAuthAgent(credential, siteConfig) {
    this.credential = credential
    this.siteConfig = siteConfig
    this.loginForm = getLoginFormOnPage(siteConfig)
    this.elementsIndicatingUserIsLoggedIn = getElementsIndicatingUserIsLoggedIn(siteConfig)
}

PasswordAuthAgent.pageHasALoginForm = pageHasALoginForm

PasswordAuthAgent.prototype.loginErrorCallback = function(error) {
    console.log(error)
}

PasswordAuthAgent.prototype.CLONED_ELEMENT_IDS = {
    usernameField: 'cloned-username-input',
    passwordField: 'cloned-password-input'
}

PasswordAuthAgent.prototype.pageHasALoginForm = function() {
    return PasswordAuthAgent.pageHasALoginForm(this.siteConfig)
}

PasswordAuthAgent.prototype.cloneLoginFormField = function($originalField, newFieldId) {
    var originalPosition = $originalField.offset()
    var $newField = $originalField.clone()

    $newField.attr('style', getComputedStyle($originalField[0]).cssText)
    $newField.css({
        position: 'absolute',
        top: originalPosition.top,
        left: originalPosition.left,
        'z-index': 1000
    })
    if (this.loginForm.isBlurred) {
        $newField.Vague({intensity: 4}).blur()
    }
    $('body').append($newField)
    $newField.attr('id', newFieldId)
    $newField.attr('name', '')
}

PasswordAuthAgent.prototype.cloneAllLoginFormFields = function() {
    /* Clone the username and password fields into dummy fields that are
     positioned over the real fields. The real fields will get filled in but
     the user won't see that. This gives the feeling that it's magic. */

    if (this.loginForm) {
        var $clonedUsernameField = $('#' + this.CLONED_ELEMENT_IDS.usernameField)
        var $clonedPasswordField = $('#' + this.CLONED_ELEMENT_IDS.passwordField)
        var clonedFieldsExist = $clonedPasswordField.length && $clonedPasswordField.length
        if (!clonedFieldsExist) {
            this.cloneLoginFormField(this.loginForm.usernameField, this.CLONED_ELEMENT_IDS.usernameField)
            this.cloneLoginFormField(this.loginForm.passwordField, this.CLONED_ELEMENT_IDS.passwordField)
        }
    }
}

PasswordAuthAgent.prototype.triggerEventsForField = function($field, value) {
    $field.focus().val(value).keydown().keypress().keyup().change().blur()
}

PasswordAuthAgent.prototype.triggerEventsAcrossFormFields = function() {
    /* Execute events to trigger event handlers like form validators
     (e.g. element.keydown().keypress().keyup().change().blur()). */
    this.triggerEventsForField(this.loginForm.usernameField, this.credential.username)
    this.triggerEventsForField(this.loginForm.passwordField, this.credential.password)
}

PasswordAuthAgent.prototype.forceEnableSubmitButton = function() {
    /* Force the submit button to be enabled. */
    this.loginForm.submitButton.prop('disabled', false)
}

PasswordAuthAgent.prototype.createHiddenForm = function() {
    /* Create a hidden login form on the page, with a username field and a
       password field. */
}

PasswordAuthAgent.prototype.getLoginPageViaProxy = function(callbackFunction) {
    /* Message the background page to send a proxy request to grab the page
     at the login URL. */
    var pageHTML = ""
    callbackFunction(pageHTML)
}

PasswordAuthAgent.prototype.addHiddenInputsToPage = function(pageHTML) {
    /* Get the hidden inputs from the page and add them to the form. */
}

PasswordAuthAgent.prototype.userIsLoggedIn = function() {
    if (this.elementsIndicatingUserIsLoggedIn !== null) {
        return (this.elementsIndicatingUserIsLoggedIn.length > 0)
    }
    return false
}

PasswordAuthAgent.prototype.setLoginErrorTimeout = function() {
    /* Trigger the form's submit function */
    var _this = this
    setTimeout(function() {
        var errorMessage = 'login failed'
        _this.loginErrorCallback(errorMessage)
    }, 2000)
}

PasswordAuthAgent.prototype.submitLoginForm = function() {
    /* Submit the login form on the page. */
    if (this.loginForm.submitButton.length) {
        /* Click the submit button */
        this.loginForm.submitButton.click()
    } else {
        /* Trigger the form's submit function */
       this.loginForm.container.submit()
    }
    this.loginStartedCallback()
    this.setLoginErrorTimeout()
}

PasswordAuthAgent.prototype.loginOnPageWithLoginForm = function() {
    /* Looks like we're on a page with a login form. Login appropriately. */
    this.cloneAllLoginFormFields()
    this.triggerEventsAcrossFormFields()
    this.forceEnableSubmitButton()
    this.submitLoginForm()
}

PasswordAuthAgent.prototype.loginOnPageWithoutLoginForm = function() {
    /* Looks like we're on a page without a login form. Login appropriately. */
    var _this = this

    this.createHiddenForm()
    this.getLoginPageViaProxy(function(pageHTML) {
       _this.addHiddenInputsToPage(pageHTML)
        _this.submitLoginForm()
    })
}

PasswordAuthAgent.prototype.triggerLogin = function() {
    if (this.pageHasALoginForm()) {
        this.loginOnPageWithLoginForm()
    } else {
       var errorMessage = 'no login form found on page'
        this.loginErrorCallback(errorMessage)
        //this.loginOnPageWithoutLoginForm()
    }
}

module.exports = PasswordAuthAgent
