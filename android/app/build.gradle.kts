plugins {
    id("com.android.application")
}

// Version and signing come from the CI workflow (.github/workflows/android.yml).
// Each upload to Google Play needs a higher versionCode than the last one.
val kamiVersionCode = (findProperty("kamiVersionCode") as String?)?.toInt() ?: 2
val kamiVersionName = (findProperty("kamiVersionName") as String?) ?: "1.1"
val keystorePath: String? = System.getenv("KAMI_KEYSTORE")

android {
    namespace = "il.co.heykami.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "il.co.heykami.app"
        minSdk = 26
        targetSdk = 36
        versionCode = kamiVersionCode
        versionName = kamiVersionName
    }

    signingConfigs {
        if (keystorePath != null) {
            create("upload") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("KAMI_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KAMI_KEY_ALIAS")
                keyPassword = System.getenv("KAMI_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystorePath != null) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
