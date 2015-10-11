'use strict'

function PasswordAuthAgent(credential, siteConfig) {
    // Set the credentials used to login to the site
    this.credential = credential

    // Get and set the login form for the site
    if (siteConfig) {
        // Get the login form based on the site-specific config file
        this.loginForm = this.getLoginFormFromConfigs(siteConfig)
        this.elementsIndicatingUserIsLoggedIn = $(siteConfig.login.check)
    } else {
        // Get the login form by scanning the page
        this.loginForm = this.getLoginFormFromPage()
        this.elementsIndicatingUserIsLoggedIn = null
    }
}

PasswordAuthAgent.prototype.CLONED_ELEMENT_IDS = {
    usernameField: 'cloned-username-input',
    passwordField: 'cloned-password-input'
}

PasswordAuthAgent.prototype.findInput = function(name) {
    return $('input[name="' + name + '"]')
}

PasswordAuthAgent.prototype.getMostLikelyLoginFormElement = function() {
    var passwordInputs = $("input[type='password']:visible")

    var $loginFormElement = null
    var maxScore = -Infinity

    passwordInputs.each(function() {
        var $form = $(this).parents('form:visible')
        if ($form.length) {
            // Ignore forms that don't have any email or text input fields
            if (!$form.find("input[type='email'], input[type='text'], input:not([type])").length) {
                return
            }
            // Ignore forms that look like they're for changing the user's email
            var submitButtons = $form.find("input[type='submit'], button, input[type='image']")
            if (submitButtons.text().match(/change email/i)) {
                return
            }
            // Ignore forms that have more than one text/email input
            if ($form.find("input[type='text']:visible").length +
                $form.find("input[type='email']:visible").length > 1) {
                return
            }
            var hasButtons = submitButtons.length > 0
            var hasRememberMe = $form.find("input[type='checkbox']").length == 1
            var otherInputsScore = $form
                .find('input')
                .not("[type='checkbox'] [type='text'], [type='email'], [type='password'], [type='submit'], [type='hidden']")
                .length * 2
            otherInputsScore += $form
                .find('input')
                .filter(':not(#waltz-cloned-username), :not(#waltz-cloned-password)')
                .filter("[type='checkbox'], [type='text'], [type='email'], [type='password'], [type='submit']")
                .length - hasRememberMe - hasButtons - 2
            var score = 0
            score += hasButtons + hasRememberMe - otherInputsScore
            if (score > maxScore) {
                maxScore = score
                $loginFormElement = $form
            }
        }
    })

    return $loginFormElement
}

PasswordAuthAgent.prototype.extractLoginFormInfo = function($loginFormElement) {
    var $usernameField = $loginFormElement.find("input[type='text'], input:not([type])").first(),
        $passwordField = $loginFormElement.find("input[type='password']").first(),
        $submitButton = $loginFormElement.find("input[type='submit'], button, input[type='image']").first(),
        $emailField = $loginFormElement.find("input[type='email']")

    if ($emailField.length) {
        $usernameField = $emailField.first()
    }

    var commonUsernameClasses = ['login', 'uid', 'email', 'user', 'username']
    $.each(commonUsernameClasses, function(i, usernameClass) {
        var matches = $loginFormElement.find('input.' + usernameClass + ', input#' + usernameClass)
        if (matches.length) {
            $usernameField = $(matches).first()
        }
    })

    var loginForm = {
        container: $loginFormElement,
        usernameField: $usernameField,
        passwordField: $passwordField,
        submitButton: $submitButton,
        isBlurred: false
    }

    return loginForm
}

PasswordAuthAgent.prototype.getLoginFormFromPage = function() {
    var $loginFormElement = this.getMostLikelyLoginFormElement()
    if (!$loginFormElement) {
        return null
    }
    return this.extractLoginFormInfo($loginFormElement)
}

PasswordAuthAgent.prototype.getLoginFormFromConfigs = function(siteConfig) {
    var loginForm = null

    var $usernameField = this.findInput(siteConfig.login.usernameField),
        $passwordField = this.findInput(siteConfig.login.passwordField),
        $loginFormElement = $usernameField.parents('form'),
        $submitButton = $loginFormElement.find("input[type='submit'], button, input[type='image']")

    if (siteConfig.login.submitButton) {
        // If we're on the wrong form, reselect the username and password fields
        $loginFormElement = $loginFormElement.filter(':has(' + siteConfig.login.submitButton + ')')
        $usernameField = $loginFormElement.find('input[name="' + siteConfig.login.usernameField + '"]')
        $passwordField = $loginFormElement.find('input[name="' + siteConfig.login.passwordField + '"]')
        $submitButton = $loginFormElement.find(siteConfig.login.submitButton)
    } else {
        $usernameField = $usernameField
        $passwordField = $passwordField
        $loginFormElement = $loginFormElement
    }

    if ($loginFormElement.length && $usernameField.length && $passwordField.length) {
        loginForm = {
          container: $loginFormElement.first(),
          usernameField: $usernameField.first(),
          passwordField: $passwordField.first(),
          submitButton: $submitButton.first(),
          isBlurred: false
        }
        if (siteConfig.login.formURL) {
          loginForm.formURL = siteConfig.login.formURL
          loginForm.container.attr('action', loginForm.formURL)
        }
    }

    return loginForm
}

PasswordAuthAgent.prototype.pageHasALoginForm = function() {
    /* Check to see if the page has a login form. */
    if (this.loginForm && this.loginForm !== null) {
        return true
    } else {
        return false
    }
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
    var error = 'login failed'
        _this.loginErrorCallback()
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
       var error = 'no login form found on page'
        this.loginErrorCallback()
        //this.loginOnPageWithoutLoginForm()
    }
}
