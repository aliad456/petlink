package il.co.heykami.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.SystemClock;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

// Opening screen of the app, drawn over the WebView until the first page has loaded.
// Light, like the site: the background with the pet doodles, the K in its glowing ring
// that opens into the "Kami" wordmark (the same animation as the site's logo on hover,
// src/components/logo.tsx), "טוען…" with a gradient progress bar, the BETA tag, and
// "by APPEB" at the bottom.
//
// Sizes follow the site's logo, in "em" = the K's height.
final class KamiSplash {
    private static final long MIN_SHOW_MS = 1700;
    private static final long MAX_SHOW_MS = 12000;

    private final Activity activity;
    private final Runnable onGone;
    private final float em;
    private final FrameLayout view;
    private final View ring;
    private final ImageView k;
    private final FrameLayout amiClip;
    private final View letters;
    private final ImageView leaf;
    private final LinearLayout block;
    private final Bar bar;
    private final long shownAt = SystemClock.uptimeMillis();
    private boolean ready;
    private boolean leaving;

    KamiSplash(Activity activity, Runnable onGone) {
        this.activity = activity;
        this.onGone = onGone;
        this.em = dp(56);
        Context c = activity;

        view = new FrameLayout(c);
        view.setClickable(true); // nothing behind it reacts to touches yet
        view.setClipChildren(false);
        view.setBackgroundColor(c.getColor(R.color.splash_bg));

        ImageView bg = new ImageView(c);
        bg.setImageResource(R.drawable.splash_bg);
        bg.setScaleType(ImageView.ScaleType.CENTER_CROP);
        view.addView(bg, new FrameLayout.LayoutParams(-1, -1));

        // The logo, always left-to-right like the artwork.
        LinearLayout logo = new LinearLayout(c);
        logo.setOrientation(LinearLayout.HORIZONTAL);
        logo.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        logo.setGravity(Gravity.CENTER_VERTICAL);
        logo.setClipChildren(false);
        view.addView(logo, new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER));

        int ringSize = Math.round(1.6f * em);
        FrameLayout ringBox = new FrameLayout(c);
        ringBox.setClipChildren(false);
        logo.addView(ringBox, new LinearLayout.LayoutParams(ringSize, ringSize));

        ring = new Ring(c, ringSize, 0.075f * em, 0.35f * em);
        int glowBox = Math.round(ringSize * 1.8f);
        ringBox.addView(ring, new FrameLayout.LayoutParams(glowBox, glowBox, Gravity.CENTER));

        k = new ImageView(c);
        k.setImageResource(R.drawable.kami_k);
        ringBox.addView(k, new FrameLayout.LayoutParams(Math.round(1.0244f * em), Math.round(em), Gravity.CENTER));

        // "ami" opens out of the K: a clip whose width grows from 0.
        amiClip = new FrameLayout(c);
        amiClip.setClipChildren(true);
        logo.addView(amiClip, new LinearLayout.LayoutParams(0, Math.round(1.12f * em)));

        FrameLayout ami = new FrameLayout(c);
        ami.setClipChildren(false);
        amiClip.addView(ami, new FrameLayout.LayoutParams(Math.round(2.42f * em), Math.round(1.12f * em)));

        ImageView lettersImg = new ImageView(c);
        lettersImg.setImageResource(R.drawable.kami_letters);
        lettersImg.setScaleType(ImageView.ScaleType.FIT_CENTER);
        lettersImg.setColorFilter(c.getColor(R.color.splash_text), PorterDuff.Mode.SRC_IN);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                Math.round(2.31f * em), Math.round(0.727f * em), Gravity.BOTTOM | Gravity.LEFT);
        lp.bottomMargin = Math.round(0.02f * em);
        ami.addView(lettersImg, lp);
        letters = lettersImg;

        leaf = new ImageView(c);
        leaf.setImageResource(R.drawable.kami_leaf);
        int leafH = Math.round(0.346f * em);
        FrameLayout.LayoutParams fp = new FrameLayout.LayoutParams(Math.round(leafH * 56f / 64f), leafH, Gravity.TOP | Gravity.LEFT);
        fp.leftMargin = Math.round(2.08f * em);
        fp.topMargin = Math.round(0.125f * em);
        ami.addView(leaf, fp);

        // "טוען…", the bar and BETA, under the logo.
        block = new LinearLayout(c);
        block.setOrientation(LinearLayout.VERTICAL);
        block.setGravity(Gravity.CENTER_HORIZONTAL);
        view.addView(block, new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL));

        TextView loading = new TextView(c);
        loading.setText(R.string.splash_loading);
        loading.setTextColor(c.getColor(R.color.splash_muted));
        loading.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        block.addView(loading);

        bar = new Bar(c);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(Math.round(dp(184)), Math.round(dp(6)));
        bp.topMargin = Math.round(dp(14));
        block.addView(bar, bp);

        TextView beta = new TextView(c);
        beta.setText("BETA");
        beta.setTextColor(Color.WHITE);
        beta.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        beta.setTypeface(Typeface.DEFAULT_BOLD);
        beta.setLetterSpacing(0.12f);
        int px = Math.round(dp(9)), py = Math.round(dp(2));
        beta.setPadding(px, py, px, py);
        GradientDrawable betaBg = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[] {Color.parseColor("#22D3EE"), Color.parseColor("#3B82F6")});
        betaBg.setCornerRadius(dp(99));
        beta.setBackground(betaBg);
        beta.setElevation(dp(2));
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(-2, -2);
        tp.topMargin = Math.round(dp(18));
        block.addView(beta, tp);

        TextView by = new TextView(c);
        SpannableString s = new SpannableString("by APPEB");
        s.setSpan(new StyleSpan(Typeface.BOLD), 3, 8, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        by.setText(s);
        by.setTextColor(c.getColor(R.color.splash_muted));
        by.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        by.setLetterSpacing(0.04f);
        FrameLayout.LayoutParams byp = new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.RIGHT);
        int side = Math.round(dp(24));
        byp.rightMargin = side;
        byp.bottomMargin = side;
        view.addView(by, byp);

        // Keep "by APPEB" above the navigation bar; the block sits just under the ring.
        view.setOnApplyWindowInsetsListener((v, insets) -> {
            byp.bottomMargin = side + bottomInset(insets);
            by.setLayoutParams(byp);
            return insets;
        });
        view.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) ->
                block.setY((b - t) / 2f + ringSize / 2f + dp(36)));
    }

    void show() {
        ViewGroup decor = (ViewGroup) activity.getWindow().getDecorView();
        decor.addView(view, new FrameLayout.LayoutParams(-1, -1));

        letters.setAlpha(0f);
        letters.setTranslationX(-0.4f * em);
        leaf.setScaleX(0f);
        leaf.setScaleY(0f);
        leaf.setRotation(-45f);
        leaf.setPivotX(0f);
        leaf.post(() -> leaf.setPivotY(leaf.getHeight()));
        block.setAlpha(0f);
        block.setTranslationY(dp(10));

        // Android 12+ already showed the ring and K on its own launch screen, in the
        // same place, so they stay put there; older versions fade them in.
        long open = 450;
        if (Build.VERSION.SDK_INT < 31) {
            for (View v : new View[] {ring, k}) {
                v.setAlpha(0f);
                v.setScaleX(0.8f);
                v.setScaleY(0.8f);
                v.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(380)
                        .setInterpolator(new OvershootInterpolator(1.3f)).start();
            }
            open = 650;
        }

        block.animate().alpha(1f).translationY(0f).setStartDelay(open - 200).setDuration(450)
                .setInterpolator(new DecelerateInterpolator()).start();

        // The ring dissolves outward, the K grows a little and "ami" opens out of it.
        ring.animate().scaleX(1.35f).scaleY(1.35f).alpha(0f).setStartDelay(open).setDuration(500)
                .setInterpolator(new DecelerateInterpolator(1.6f)).start();
        k.animate().scaleX(1.12f).scaleY(1.12f).setStartDelay(open).setDuration(500)
                .setInterpolator(new OvershootInterpolator(1.4f)).start();

        int full = Math.round(2.42f * em), tuck = Math.round(-0.41f * em);
        ValueAnimator grow = ValueAnimator.ofFloat(0f, 1f);
        grow.setStartDelay(open);
        grow.setDuration(600);
        grow.setInterpolator(new OvershootInterpolator(1.2f));
        grow.addUpdateListener(a -> {
            float f = (float) a.getAnimatedValue();
            LinearLayout.LayoutParams p = (LinearLayout.LayoutParams) amiClip.getLayoutParams();
            p.width = Math.max(0, Math.round(full * f));
            p.leftMargin = Math.round(tuck * Math.min(1f, f));
            amiClip.setLayoutParams(p);
        });
        grow.start();
        letters.animate().alpha(1f).translationX(0f).setStartDelay(open).setDuration(500)
                .setInterpolator(new DecelerateInterpolator(1.6f)).start();
        leaf.animate().scaleX(1f).scaleY(1f).rotation(0f).setStartDelay(open + 150).setDuration(500)
                .setInterpolator(new OvershootInterpolator(1.6f)).start();

        view.postDelayed(this::markReady, MAX_SHOW_MS);
    }

    boolean isShowing() {
        return !leaving;
    }

    void setProgress(int percent) {
        bar.setTarget(Math.max(0.08f, percent / 100f));
    }

    /** The first page has loaded: finish the animation, then fade out. */
    void markReady() {
        if (ready) return;
        ready = true;
        long wait = Math.max(0, MIN_SHOW_MS - (SystemClock.uptimeMillis() - shownAt));
        view.postDelayed(() -> {
            bar.setTarget(1f);
            view.postDelayed(this::leave, 280);
        }, wait);
    }

    /** Something went wrong (no internet): get out of the way now. */
    void dismissNow() {
        ready = true;
        leave();
    }

    private void leave() {
        if (leaving) return;
        leaving = true;
        view.animate().alpha(0f).scaleX(1.03f).scaleY(1.03f).setStartDelay(0).setDuration(320)
                .setInterpolator(new DecelerateInterpolator())
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        ViewGroup parent = (ViewGroup) view.getParent();
                        if (parent != null) parent.removeView(view);
                        onGone.run();
                    }
                }).start();
    }

    @SuppressWarnings("deprecation")
    private static int bottomInset(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= 30) {
            return insets.getInsets(WindowInsets.Type.systemBars()).bottom;
        }
        return insets.getSystemWindowInsetBottom();
    }

    private float dp(float v) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, activity.getResources().getDisplayMetrics());
    }

    // The gradient ring with its soft glow (the site's conic-gradient ring).
    private static final class Ring extends View {
        private final float size;
        private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final int[] colors = {
                Color.parseColor("#4ADE80"), Color.parseColor("#22D3EE"), Color.parseColor("#3B82F6"),
                Color.parseColor("#22D3EE"), Color.parseColor("#4ADE80")};

        Ring(Context c, float size, float width, float blur) {
            super(c);
            this.size = size;
            setLayerType(LAYER_TYPE_SOFTWARE, null); // for the blur
            stroke.setStyle(Paint.Style.STROKE);
            stroke.setStrokeWidth(width);
            glow.setStyle(Paint.Style.STROKE);
            glow.setStrokeWidth(width * 2.2f);
            glow.setColor(Color.argb(140, 34, 211, 238));
            glow.setMaskFilter(new BlurMaskFilter(blur, BlurMaskFilter.Blur.NORMAL));
        }

        @Override
        protected void onSizeChanged(int w, int h, int ow, int oh) {
            SweepGradient g = new SweepGradient(w / 2f, h / 2f, colors, null);
            Matrix m = new Matrix();
            m.setRotate(110f, w / 2f, h / 2f); // CSS "from 200deg" starts at the top, Android at 3 o'clock
            g.setLocalMatrix(m);
            stroke.setShader(g);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            float r = (size - stroke.getStrokeWidth()) / 2f;
            canvas.drawCircle(getWidth() / 2f, getHeight() / 2f, r, glow);
            canvas.drawCircle(getWidth() / 2f, getHeight() / 2f, r, stroke);
        }
    }

    // Rounded progress bar with the brand gradient (green → cyan → blue). It eases
    // toward the WebView's progress instead of jumping.
    private static final class Bar extends View {
        private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF rect = new RectF();
        private float value = 0.04f;
        private ValueAnimator anim;

        Bar(Context c) {
            super(c);
            track.setColor(Color.argb(70, 8, 145, 178));
        }

        void setTarget(float target) {
            if (target <= value) return;
            if (anim != null) anim.cancel();
            anim = ValueAnimator.ofFloat(value, target);
            anim.setDuration(target >= 1f ? 250 : 500);
            anim.setInterpolator(new DecelerateInterpolator());
            anim.addUpdateListener(a -> {
                value = (float) a.getAnimatedValue();
                invalidate();
            });
            anim.start();
        }

        @Override
        protected void onSizeChanged(int w, int h, int ow, int oh) {
            fill.setShader(new LinearGradient(w, 0, 0, 0,
                    new int[] {Color.parseColor("#4ADE80"), Color.parseColor("#22D3EE"), Color.parseColor("#3B82F6")},
                    null, Shader.TileMode.CLAMP));
        }

        @Override
        protected void onDraw(Canvas canvas) {
            float h = getHeight(), w = getWidth(), r = h / 2f;
            rect.set(0, 0, w, h);
            canvas.drawRoundRect(rect, r, r, track);
            // Fills from the right, the start of the line in Hebrew.
            float fw = Math.max(h, w * value);
            rect.set(w - fw, 0, w, h);
            canvas.drawRoundRect(rect, r, r, fill);
        }
    }
}
