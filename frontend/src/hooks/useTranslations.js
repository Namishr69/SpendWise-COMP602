import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AuthContext,
} from '../context/authContext.js'
import {
  LanguageContext,
} from '../context/languageContext.js'
import {
  translateTexts,
} from '../api/translationApi.js'

const PUBLIC_TRANSLATIONS = {
  fil: {
    // Login
    Login: 'Mag-login',
    'Login to access your SpendWise account':
      'Mag-login upang ma-access ang iyong SpendWise account',
    Email: 'Email',
    Password: 'Password',
    'Hide password': 'Itago ang password',
    'Show password': 'Ipakita ang password',
    'Remember me': 'Tandaan ako',
    'Forgot Password?':
      'Nakalimutan ang Password?',
    'Logging in...':
      'Nagla-login...',
    "Don't have an account?":
      'Wala ka pang account?',
    'Sign up': 'Mag-sign up',
    'Or login with':
      'O mag-login gamit ang',
    'Continue with Google':
      'Magpatuloy gamit ang Google',
    'Continue with Apple':
      'Magpatuloy gamit ang Apple',
    'Please enter your email and password.':
      'Pakilagay ang iyong email at password.',
    'Apple sign-in is coming soon.':
      'Malapit nang maging available ang pag-sign in gamit ang Apple.',

    // Signup
    "Let's get you all set up so you can access your personal account.":
      'I-set up natin ang iyong account upang ma-access mo ang iyong personal na account.',
    'First Name': 'Pangalan',
    'Last Name': 'Apelyido',
    'Confirm Password':
      'Kumpirmahin ang Password',
    'I agree to all the':
      'Sumasang-ayon ako sa lahat ng',
    Terms: 'Mga Tuntunin',
    and: 'at',
    'Privacy Policies':
      'Mga Patakaran sa Privacy',
    'Creating account...':
      'Ginagawa ang account...',
    'Create account':
      'Gumawa ng account',
    'Already have an account?':
      'May account ka na?',
    'Or sign up with':
      'O mag-sign up gamit ang',
    'Sign up with Google':
      'Mag-sign up gamit ang Google',
    'Sign up with Apple':
      'Mag-sign up gamit ang Apple',
    'Please fill in all fields.':
      'Pakipunan ang lahat ng field.',
    'Passwords do not match.':
      'Hindi magkatugma ang mga password.',
    'Please agree to the Terms and Privacy Policy to continue.':
      'Mangyaring sumang-ayon sa Mga Tuntunin at Patakaran sa Privacy upang magpatuloy.',
    'Account created, but we could not save your details. You can still log in — please try updating your profile afterwards.':
      'Nagawa ang account, ngunit hindi namin na-save ang iyong mga detalye. Maaari ka pa ring mag-login — subukang i-update ang iyong profile pagkatapos.',
    'Apple sign-up is coming soon.':
      'Malapit nang maging available ang pag-sign up gamit ang Apple.',

    // Forgot password
    'Check your email':
      'Tingnan ang iyong email',
    'If an account exists with that email, a password reset link has been sent.':
      'Kung may account na gumagamit ng email na iyon, naipadala na ang link para i-reset ang password.',
    'Back to Login':
      'Bumalik sa Login',
    'Reset your password':
      'I-reset ang iyong password',
    "Enter your email and we'll send you a reset link.":
      'Ilagay ang iyong email at padadalhan ka namin ng reset link.',
    'Please fill in an email.':
      'Pakilagay ang iyong email.',
    'Sending...':
      'Ipinapadala...',
    'Send Reset Link':
      'Ipadala ang Reset Link',

    // Auth errors
    'An account with this email already exists.':
      'May account nang gumagamit ng email na ito.',
    'Please enter a valid email address.':
      'Mangyaring maglagay ng wastong email address.',
    'Password should be at least 6 characters.':
      'Ang password ay dapat may hindi bababa sa 6 na character.',
    'Incorrect email or password.':
      'Mali ang email o password.',
    'Too many attempts. Please try again later.':
      'Masyadong maraming pagsubok. Pakisubukan muli mamaya.',
    'Something went wrong. Please try again.':
      'May nangyaring problema. Pakisubukan muli.',

    // Landing
    Tracking: 'Pagsubaybay',
    Made: 'Ginawang',
    Simple: 'Simple',
    'See all your bills and subscriptions in one place':
      'Tingnan ang lahat ng iyong bills at subscriptions sa iisang lugar',
    'Our features':
      'Mga feature namin',
    'Track subscriptions':
      'Subaybayan ang subscriptions',
    'Free trial alerts':
      'Mga alerto sa free trial',
    'Monthly spending summary':
      'Buwanang buod ng gastos',
    'See exactly where your money goes each month':
      'Tingnan kung saan napupunta ang iyong pera bawat buwan',

    // Not Found
    'Page not found':
      'Hindi mahanap ang pahina',
    'Go to Dashboard':
      'Pumunta sa Dashboard',
  },

  mi: {
    // Login
    Login: 'Takiuru',
    'Login to access your SpendWise account':
      'Takiuru kia uru atu ki tō pūkete SpendWise',
    Email: 'Īmēra',
    Password: 'Kupuhipa',
    'Hide password':
      'Hunaia te kupuhipa',
    'Show password':
      'Whakaaturia te kupuhipa',
    'Remember me':
      'Maumaharatia ahau',
    'Forgot Password?':
      'Kua wareware te kupuhipa?',
    'Logging in...':
      'E takiuru ana...',
    "Don't have an account?":
      'Kāore anō kia whai pūkete?',
    'Sign up': 'Rēhita',
    'Or login with':
      'Takiuru rānei mā',
    'Continue with Google':
      'Haere tonu mā Google',
    'Continue with Apple':
      'Haere tonu mā Apple',
    'Please enter your email and password.':
      'Tāuruhia tō īmēra me tō kupuhipa.',
    'Apple sign-in is coming soon.':
      'Ka wātea mai te takiuru mā Apple ākuanei.',

    // Signup
    "Let's get you all set up so you can access your personal account.":
      'Me whakarite tō pūkete kia taea ai e koe te uru atu ki tō pūkete whaiaro.',
    'First Name':
      'Ingoa tuatahi',
    'Last Name':
      'Ingoa whānau',
    'Confirm Password':
      'Whakaū kupuhipa',
    'I agree to all the':
      'E whakaae ana ahau ki ngā',
    Terms: 'Ture',
    and: 'me ngā',
    'Privacy Policies':
      'Kaupapa Tūmataiti',
    'Creating account...':
      'E waihanga ana i te pūkete...',
    'Create account':
      'Waihanga pūkete',
    'Already have an account?':
      'He pūkete kē tāu?',
    'Or sign up with':
      'Rēhita rānei mā',
    'Sign up with Google':
      'Rēhita mā Google',
    'Sign up with Apple':
      'Rēhita mā Apple',
    'Please fill in all fields.':
      'Whakakīa ngā āpure katoa.',
    'Passwords do not match.':
      'Kāore ngā kupuhipa e ōrite.',
    'Please agree to the Terms and Privacy Policy to continue.':
      'Whakaae ki ngā Ture me te Kaupapa Tūmataiti kia haere tonu.',
    'Account created, but we could not save your details. You can still log in — please try updating your profile afterwards.':
      'Kua waihangatia te pūkete, engari kāore i taea te tiaki i ō taipitopito. Ka taea tonu te takiuru — whakamātauria te whakahou i tō kōtaha ā muri ake.',
    'Apple sign-up is coming soon.':
      'Ka wātea mai te rēhita mā Apple ākuanei.',

    // Forgot password
    'Check your email':
      'Tirohia tō īmēra',
    'If an account exists with that email, a password reset link has been sent.':
      'Mēnā he pūkete mō taua īmēra, kua tukuna he hononga tautuhi kupuhipa.',
    'Back to Login':
      'Hoki ki te Takiuru',
    'Reset your password':
      'Tautuhia anō tō kupuhipa',
    "Enter your email and we'll send you a reset link.":
      'Tāuruhia tō īmēra, ā, ka tukuna atu he hononga tautuhi.',
    'Please fill in an email.':
      'Tāuruhia he īmēra.',
    'Sending...':
      'E tuku ana...',
    'Send Reset Link':
      'Tukua te Hononga Tautuhi',

    // Auth errors
    'An account with this email already exists.':
      'Kei te tīari kē tētahi pūkete me tēnei īmēra.',
    'Please enter a valid email address.':
      'Tāuruhia he wāhitau īmēra tika.',
    'Password should be at least 6 characters.':
      'Kia ono neke atu ngā pūāhua o te kupuhipa.',
    'Incorrect email or password.':
      'Kei te hē te īmēra, te kupuhipa rānei.',
    'Too many attempts. Please try again later.':
      'He nui rawa ngā whakamātau. Ngana anō ā muri ake.',
    'Something went wrong. Please try again.':
      'Kua puta he raruraru. Ngana anō.',

    // Landing
    Tracking: 'Aroturuki',
    Made: 'Kia',
    Simple: 'Māmā',
    'See all your bills and subscriptions in one place':
      'Tirohia ō pire me ō ohaurunga katoa ki te wāhi kotahi',
    'Our features':
      'Ā mātou āhuatanga',
    'Track subscriptions':
      'Aroturuki ohaurunga',
    'Free trial alerts':
      'Matohi whakamātautau kore utu',
    'Monthly spending summary':
      'Whakarāpopototanga whakapaunga ā-marama',
    'See exactly where your money goes each month':
      'Tirohia te wāhi e haere ai tō moni ia marama',

    // Not Found
    'Page not found':
      'Kāore i kitea te whārangi',
    'Go to Dashboard':
      'Haere ki te Paemana',
  },

  es: {
    // Login
    Login: 'Iniciar sesión',
    'Login to access your SpendWise account':
      'Inicia sesión para acceder a tu cuenta de SpendWise',
    Email: 'Correo electrónico',
    Password: 'Contraseña',
    'Hide password':
      'Ocultar contraseña',
    'Show password':
      'Mostrar contraseña',
    'Remember me':
      'Recordarme',
    'Forgot Password?':
      '¿Olvidaste tu contraseña?',
    'Logging in...':
      'Iniciando sesión...',
    "Don't have an account?":
      '¿No tienes una cuenta?',
    'Sign up': 'Registrarse',
    'Or login with':
      'O inicia sesión con',
    'Continue with Google':
      'Continuar con Google',
    'Continue with Apple':
      'Continuar con Apple',
    'Please enter your email and password.':
      'Introduce tu correo electrónico y contraseña.',
    'Apple sign-in is coming soon.':
      'El inicio de sesión con Apple estará disponible pronto.',

    // Signup
    "Let's get you all set up so you can access your personal account.":
      'Vamos a configurar todo para que puedas acceder a tu cuenta personal.',
    'First Name': 'Nombre',
    'Last Name': 'Apellido',
    'Confirm Password':
      'Confirmar contraseña',
    'I agree to all the':
      'Acepto todos los',
    Terms: 'Términos',
    and: 'y',
    'Privacy Policies':
      'Políticas de privacidad',
    'Creating account...':
      'Creando cuenta...',
    'Create account':
      'Crear cuenta',
    'Already have an account?':
      '¿Ya tienes una cuenta?',
    'Or sign up with':
      'O regístrate con',
    'Sign up with Google':
      'Registrarse con Google',
    'Sign up with Apple':
      'Registrarse con Apple',
    'Please fill in all fields.':
      'Completa todos los campos.',
    'Passwords do not match.':
      'Las contraseñas no coinciden.',
    'Please agree to the Terms and Privacy Policy to continue.':
      'Acepta los Términos y la Política de privacidad para continuar.',
    'Account created, but we could not save your details. You can still log in — please try updating your profile afterwards.':
      'La cuenta fue creada, pero no pudimos guardar tus datos. Aún puedes iniciar sesión; intenta actualizar tu perfil después.',
    'Apple sign-up is coming soon.':
      'El registro con Apple estará disponible pronto.',

    // Forgot password
    'Check your email':
      'Revisa tu correo electrónico',
    'If an account exists with that email, a password reset link has been sent.':
      'Si existe una cuenta con ese correo electrónico, se ha enviado un enlace para restablecer la contraseña.',
    'Back to Login':
      'Volver al inicio de sesión',
    'Reset your password':
      'Restablece tu contraseña',
    "Enter your email and we'll send you a reset link.":
      'Introduce tu correo electrónico y te enviaremos un enlace para restablecerla.',
    'Please fill in an email.':
      'Introduce un correo electrónico.',
    'Sending...':
      'Enviando...',
    'Send Reset Link':
      'Enviar enlace de restablecimiento',

    // Auth errors
    'An account with this email already exists.':
      'Ya existe una cuenta con este correo electrónico.',
    'Please enter a valid email address.':
      'Introduce una dirección de correo electrónico válida.',
    'Password should be at least 6 characters.':
      'La contraseña debe tener al menos 6 caracteres.',
    'Incorrect email or password.':
      'Correo electrónico o contraseña incorrectos.',
    'Too many attempts. Please try again later.':
      'Demasiados intentos. Inténtalo de nuevo más tarde.',
    'Something went wrong. Please try again.':
      'Algo salió mal. Inténtalo de nuevo.',

    // Landing
    Tracking: 'Seguimiento',
    Made: 'Hecho',
    Simple: 'Simple',
    'See all your bills and subscriptions in one place':
      'Consulta todas tus facturas y suscripciones en un solo lugar',
    'Our features':
      'Nuestras funciones',
    'Track subscriptions':
      'Controla tus suscripciones',
    'Free trial alerts':
      'Alertas de pruebas gratuitas',
    'Monthly spending summary':
      'Resumen de gastos mensuales',
    'See exactly where your money goes each month':
      'Descubre exactamente adónde va tu dinero cada mes',

    // Not Found
    'Page not found':
      'Página no encontrada',
    'Go to Dashboard':
      'Ir al panel',
  },

  fr: {
    // Login
    Login: 'Connexion',
    'Login to access your SpendWise account':
      'Connectez-vous pour accéder à votre compte SpendWise',
    Email: 'E-mail',
    Password: 'Mot de passe',
    'Hide password':
      'Masquer le mot de passe',
    'Show password':
      'Afficher le mot de passe',
    'Remember me':
      'Se souvenir de moi',
    'Forgot Password?':
      'Mot de passe oublié ?',
    'Logging in...':
      'Connexion...',
    "Don't have an account?":
      "Vous n'avez pas de compte ?",
    'Sign up': "S'inscrire",
    'Or login with':
      'Ou connectez-vous avec',
    'Continue with Google':
      'Continuer avec Google',
    'Continue with Apple':
      'Continuer avec Apple',
    'Please enter your email and password.':
      'Saisissez votre e-mail et votre mot de passe.',
    'Apple sign-in is coming soon.':
      'La connexion avec Apple sera bientôt disponible.',

    // Signup
    "Let's get you all set up so you can access your personal account.":
      'Configurons votre compte afin que vous puissiez accéder à votre espace personnel.',
    'First Name': 'Prénom',
    'Last Name': 'Nom',
    'Confirm Password':
      'Confirmer le mot de passe',
    'I agree to all the':
      "J'accepte tous les",
    Terms: 'Conditions',
    and: 'et',
    'Privacy Policies':
      'Politiques de confidentialité',
    'Creating account...':
      'Création du compte...',
    'Create account':
      'Créer un compte',
    'Already have an account?':
      'Vous avez déjà un compte ?',
    'Or sign up with':
      'Ou inscrivez-vous avec',
    'Sign up with Google':
      "S'inscrire avec Google",
    'Sign up with Apple':
      "S'inscrire avec Apple",
    'Please fill in all fields.':
      'Veuillez remplir tous les champs.',
    'Passwords do not match.':
      'Les mots de passe ne correspondent pas.',
    'Please agree to the Terms and Privacy Policy to continue.':
      'Veuillez accepter les Conditions et la Politique de confidentialité pour continuer.',
    'Account created, but we could not save your details. You can still log in — please try updating your profile afterwards.':
      "Le compte a été créé, mais nous n'avons pas pu enregistrer vos informations. Vous pouvez toujours vous connecter — essayez ensuite de mettre à jour votre profil.",
    'Apple sign-up is coming soon.':
      "L'inscription avec Apple sera bientôt disponible.",

    // Forgot password
    'Check your email':
      'Consultez votre e-mail',
    'If an account exists with that email, a password reset link has been sent.':
      'Si un compte existe avec cet e-mail, un lien de réinitialisation du mot de passe a été envoyé.',
    'Back to Login':
      'Retour à la connexion',
    'Reset your password':
      'Réinitialisez votre mot de passe',
    "Enter your email and we'll send you a reset link.":
      'Saisissez votre e-mail et nous vous enverrons un lien de réinitialisation.',
    'Please fill in an email.':
      'Veuillez saisir une adresse e-mail.',
    'Sending...':
      'Envoi...',
    'Send Reset Link':
      'Envoyer le lien de réinitialisation',

    // Auth errors
    'An account with this email already exists.':
      'Un compte existe déjà avec cet e-mail.',
    'Please enter a valid email address.':
      'Saisissez une adresse e-mail valide.',
    'Password should be at least 6 characters.':
      'Le mot de passe doit contenir au moins 6 caractères.',
    'Incorrect email or password.':
      'E-mail ou mot de passe incorrect.',
    'Too many attempts. Please try again later.':
      'Trop de tentatives. Réessayez plus tard.',
    'Something went wrong. Please try again.':
      "Une erreur s'est produite. Réessayez.",

    // Landing
    Tracking: 'Suivi',
    Made: 'Rendu',
    Simple: 'Simple',
    'See all your bills and subscriptions in one place':
      'Consultez toutes vos factures et vos abonnements au même endroit',
    'Our features':
      'Nos fonctionnalités',
    'Track subscriptions':
      'Suivez vos abonnements',
    'Free trial alerts':
      "Alertes d'essai gratuit",
    'Monthly spending summary':
      'Résumé des dépenses mensuelles',
    'See exactly where your money goes each month':
      'Voyez exactement où va votre argent chaque mois',

    // Not Found
    'Page not found':
      'Page introuvable',
    'Go to Dashboard':
      'Aller au tableau de bord',
  },
}

function getPublicTranslations(
  texts,
  language,
) {
  const translations =
    PUBLIC_TRANSLATIONS[language]

  if (!translations) {
    return texts
  }

  return texts.map(
    (text) =>
      translations[text] || text,
  )
}

// Resolved translations, keyed by language + the exact list of strings. A page
// visited once comes back instantly when the user switches languages again,
// and two components asking for the same strings share one backend request.
const translationCache = new Map()

function cacheKeyFor(language, textsKey) {
  return `${language}|${textsKey}`
}

export function useTranslations(
  texts,
) {
  const { currentUser } =
    useContext(AuthContext)

  const { preferredLanguage } =
    useContext(LanguageContext)

  // Most callers pass a fresh array literal on every render. The memo has to
  // key on the contents, AND it has to return the same array while the
  // contents are unchanged: the effect below depends on it, so handing back
  // the caller's new array each render would re-run the effect on every render.
  const textsKey = JSON.stringify(texts)

  const baseTexts = useMemo(
    () => JSON.parse(textsKey),
    [textsKey],
  )

  // The last translation that arrived asynchronously. Kept in state only so a
  // late response re-renders the hook; the value that is actually shown is
  // derived below, which is what makes it safe to read the shared cache
  // during render.
  const [loaded, setLoaded] = useState(null)

  useEffect(() => {
    if (
      preferredLanguage === 'en' ||
      baseTexts.length === 0
    ) {
      return undefined
    }

    const cacheKey = cacheKeyFor(
      preferredLanguage,
      textsKey,
    )

    // Already translated — switching back is instant.
    if (translationCache.has(cacheKey)) {
      return undefined
    }

    // Logged-out pages cannot use the
    // authenticated translation API.
    // Use local translations for public
    // pages instead.
    if (!currentUser) {
      return undefined
    }

    let cancelled = false

    async function loadTranslations() {
      try {
        const results =
          await translateTexts(
            currentUser,
            baseTexts,
            preferredLanguage,
          )

        if (cancelled) return

        translationCache.set(
          cacheKey,
          results,
        )

        setLoaded({
          language: preferredLanguage,
          key: textsKey,
          value: results,
        })
      } catch (error) {
        // The original English is always a correct fallback — the app stays
        // usable even when the translation service is unavailable or the API
        // key is missing. The next render shows it without any state write.
        console.error(
          'Failed to translate texts:',
          error,
        )
      }
    }

    loadTranslations()

    return () => {
      cancelled = true
    }
  }, [
    currentUser,
    preferredLanguage,
    baseTexts,
    textsKey,
  ])

  return useMemo(() => {
    if (preferredLanguage === 'en') {
      return baseTexts
    }

    const cached = translationCache.get(
      cacheKeyFor(preferredLanguage, textsKey),
    )

    if (cached) {
      return cached
    }

    if (
      loaded &&
      loaded.key === textsKey &&
      loaded.language === preferredLanguage
    ) {
      return loaded.value
    }

    if (!currentUser) {
      return getPublicTranslations(
        baseTexts,
        preferredLanguage,
      )
    }

    return baseTexts
  }, [
    baseTexts,
    currentUser,
    loaded,
    preferredLanguage,
    textsKey,
  ])
}