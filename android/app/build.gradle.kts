plugins {
    id("com.android.application")
}

// Version and signing come from the CI workflow (.github/workflows/android.yml).
// Each upload to Google Play needs a higher versionCode than the last one.
val kamiVersionCode = (findProperty("kamiVersionCode") as String?)?.toInt() ?: 2
val kamiVersionName = (findProperty("kamiVersionName") as String?) ?: "1.1"
val keystorePath: String? = System.getenv("KAMI_KEYSTORE")
// Firebase (push notifications). Empty = the app runs without push.
fun fcm(name: String) = "\"" + (System.getenv("KAMI_FCM_$name") ?: "") + "\""

android {
    namespace = "il.co.heykami.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "il.co.heykami.app"
        minSdk = 26
        targetSdk = 36
        versionCode = kamiVersionCode
        versionName = kamiVersionName
        buildConfigField("String", "FCM_APP_ID", fcm("APP_ID"))
        buildConfigField("String", "FCM_API_KEY", fcm("API_KEY"))
        buildConfigField("String", "FCM_PROJECT_ID", fcm("PROJECT_ID"))
        buildConfigField("String", "FCM_SENDER_ID", fcm("SENDER_ID"))
    }

    buildFeatures {
        buildConfig = true
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

dependencies {
    implementation("com.google.firebase:firebase-messaging:24.1.1")
    implementation("androidx.browser:browser:1.8.0")
}
