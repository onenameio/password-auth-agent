'use strict'

function getInputWithName(name) {
    return $('input[name="' + name + '"]')
}

function getloginFormSummaryFromElement($loginFormElement) {
    if (!$loginFormElement) {
        return null
    }

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

function getMostLikelyFormElementOnPage() {
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

function getLoginFormSummaryFromSiteConfig(siteConfig) {
    var loginForm = null

    var $usernameField = getInputWithName(siteConfig.login.usernameField),
        $passwordField = getInputWithName(siteConfig.login.passwordField),
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

function getLoginFormOnPage(siteConfig) {
    if (!siteConfig) {
        var $loginFormElement = getMostLikelyFormElementOnPage()
        return getloginFormSummaryFromElement($loginFormElement)
    } else {
        return getLoginFormSummaryFromSiteConfig(siteConfig)
    }
}

function pageHasALoginForm(siteConfig) {
    var loginForm = getLoginFormOnPage(siteConfig)
    if (loginForm) {
        return true
    } else {
        return false
    }
}

function getElementsIndicatingUserIsLoggedIn(siteConfig) {
    if (siteConfig) {
        return $(siteConfig.login.check)
    } else {
        return null
    }
}

module.exports = {
    getInputWithName: getInputWithName,
    getloginFormSummaryFromElement: getloginFormSummaryFromElement,
    getMostLikelyFormElementOnPage: getMostLikelyFormElementOnPage,
    getLoginFormSummaryFromSiteConfig: getLoginFormSummaryFromSiteConfig,
    getLoginFormOnPage: getLoginFormOnPage,
    pageHasALoginForm: pageHasALoginForm,
    getElementsIndicatingUserIsLoggedIn: getElementsIndicatingUserIsLoggedIn
}
