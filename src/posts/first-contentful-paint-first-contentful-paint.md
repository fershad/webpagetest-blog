---
title: First Contentful Paint !== First Contentful Paint
date: 2021-04-30T19:31:25.663Z
category: Perf Data
author: Tim Kadlec
---
With Safari 14.1 officially out, thanks to the [work of the Wikimedia team](https://techblog.wikimedia.org/2020/06/24/how-we-contributed-paint-timing-api-to-webkit/) and [Noam Rosenthal](https://twitter.com/nomsternom) in particular, First Contentful Paint just became one of the first "modern" performance metrics to be available in all major browsers: Chrome, Edge, Firefox and Safari all support it.

This is pretty massive news for performance on the web.

Over the past several years, we've seen a flurry of new performance metrics that seek to do a better job of reporting on performance from a user-centric perspective. We have metrics around layout instability (Cumulative Layout Shift), interactivity (Long Tasks, First Input Delay, etc) and visual feedback (First Paint, First Contentful Paint, Largest Contentful Paint, etc).

But as great as many of these metrics sound, and as much emphasis has been placed on a few of those with Google's Core Web Vitals initiative, there's been one glaring issue: they were mostly Chrome-only metrics.

* The Layout Stability API necessary for reporting Cumulative Layout Shift? [Blink-based browsers](https://caniuse.com/mdn-api_layoutshift) (Chrome, Edge, Opera, etc) only.
* The PerformanceLongTaskTiming API for reporting long running tasks in the main thread of the browser? [Blink only](https://caniuse.com/mdn-api_performancelongtasktiming).
* The Largest Contentful Paint API? [Blink only](https://caniuse.com/mdn-api_largestcontentfulpaint).
* The Paint Timing API necessary for providing First Paint and First Contentful Paint? [Blink and Gecko](https://caniuse.com/mdn-api_performancepainttiming) (the engine behind Firefox).

Now we can add [WebKit to the list of browsers supporting the Paint Timing API](https://firt.dev/ios-14.5/#paint-timing-api) (at least partially as they opted not to support the First Paint metric) *finally* giving us a modern, user-centered metric that we have cross-browser support for.

But there's an important caveat: First Contentful Paint isn't *exactly* apples-to-apples from one browser to the next.

## Noticing differences in WebPageTest Filmstrips

I wanted to double-check our support for First Contentful Paint in Safari 14.1 and after a minor change to our testing agents to account for the fact that Safari doesn't support the [Navigation Timing API Level 2](https://bugs.webkit.org/show_bug.cgi?id=184363), sure enough First Contentful Paint was showing up in Safari tests, but not exactly as expected.

One of the first tests I ran to double-check First Contentful Paint in Safari [was on my own site](https://www.webpagetest.org/result/210429_BiDcEP_fbb4dc3d38fed8cf13691aa4927e0f8b/2/details/#waterfall_view_step1) (I'm not self-absorbed, I swear) on a 3G Fast network. At the time, I was testing First Contentful Paint in a custom metric while the necessary changes rolled out to our testing agents, hence why you'll see a `custom-fcp` metric instead of a top-level First Contentful Paint.

First Contentful Paint came back, reported as 1.386 seconds. Great! Except for one thing: nothing was on the screen at the time.

WebPageTest's video capture records the screen of the browser as a test is run, capturing every moment alongside the timing information. It's an *incredibly* useful feature. Since it records exactly what is on the screen at the time (and doesn't rely on any internal state or any simulation, etc) it makes for a great source of truth to validate any visual related metrics. The video capture feature is also what enables the filmstrip view, and it's how WebPageTest calculates its Start Render metric (the moment something first gets displayed on the screen).

Here's what [the filmstrip](https://www.webpagetest.org/video/compare.php?tests=210429_BiDcEP_fbb4dc3d38fed8cf13691aa4927e0f8b-r%3A1-c%3A0&sticky=1&thumbSize=600&ival=16.67&end=visual) showed when First Contentful Paint fired on my page:

![A screenshot of the WebPageTest filmstrip view, showing that at the time First Contentful Paint fired, the screen was empty..nothing was actually visibly painted yet.](https://res.cloudinary.com/psaulitis/image/upload/v1619811188/fcp-tkcom-filmstrip.png.png)

There was nothing there. In fact, Start Render didn't occur until 1.5s—about 130ms later.

I decided to test a few other sites, and sure enough, the pattern was pretty consistent.

| Page                                                                                                                                   | First Contentful Paint | Start Render | Difference |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------ | ---------- |
| [Wal-Mart](https://www.webpagetest.org/result/210430_BiDcJY_1fe05e9ed2d2f003c2efe1718ccaac64/1/details/#waterfall_view_step1)          | 3.565s                 | 3.734s       | \-169ms    |
| [CNN](https://www.webpagetest.org/result/210430_AiDcBF_3aece99400f3f9d395998fa1e690155f/3/details/#waterfall_view_step1)               | 12.630s                | 12.767s      | \-137ms    |
| [Amazon](https://www.webpagetest.org/result/210430_AiDc33_15f0f2f6a7b21658729c19205e362fdd/3/details/#waterfall_view_step1)            | 3.619s                 | 3.933s       | \-314ms    |
| [Smashing Magazine](https://www.webpagetest.org/result/210430_BiDcZF_d391facd284947625cb5715e9ea7f5bf/2/details/#waterfall_view_step1) | 1.466s                 | 1.533s       | \-67ms     |
| [WebPageTest](https://www.webpagetest.org/result/210430_BiDcW0_98a3a0b519d03b0931fdcc62affa1792/2/details/#waterfall_view_step1)       | 1.124s                 | 1.367s       | \-243ms    |
| [The Guardian](https://www.webpagetest.org/result/210430_AiDcF1_69656a8d52a2259c57b1e155127a2218/1/details/#waterfall_view_step1)      | 1.036s                 | 1.233s       | \-197ms    |

In each of the tests, First Contentful Paint fired before anything was actually painted to the screen, and frequently by a pretty significant margin.

Ok. So next up, let's see what happens in Chrome and Firefox and how any gaps between First Contentful Paint and Start Render compare to what we see in Safari.

Keep in mind, the video for each test was recorded at 60fps. This means that each frame itself is *just* under 17ms. So any difference between First Contentful Paint and Start Render that falls under that 17ms threshold is beyond the limit of measurement, as well as beyond the limit of us being able to see any visual difference.

| Page                  | Difference between FCP and Start Render, Safari | Difference between FCP and Start Render, Firefox  | Difference between FCP and Start Render, Chrome (G4) |
| --------------------- | ----------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Wal-Mart              | \-169ms                                         | \-50ms                                            | \-5ms                                                |
| CNN                   | \-137ms                                         | \-50ms                                            | \-15ms                                               |
| Amazon                | \-314ms                                         | \-66ms                                            | +5ms                                                 |
| Smashing Magazine     | \-67ms                                          | \-66ms                                            | +5ms                                                 |
| WebPageTest           | \-243ms                                         | \-101ms                                           | \-5ms                                                |
| The Guardian          | \-197ms                                         | \-67ms                                            | \-30ms                                               |
| **Median Difference** | **\-188ms**                                     | **\-67ms**                                        | **\-8ms**                                            |

There's a gap in all browsers, and for most of these sites, the First Contentful Paint fires before we see something on the screen. What differs is the size of that gap. Chrome fires First Contentful Paint *very* close to when the paint actually happens—they're under that 17ms threshold which makes their metric as accurate as we could possibly ask for. 

Firefox has bit larger gap, and Safari has (comparitively) a very large gap.

I chatted with Noam (who added First Contentful Paint to Webkit) about it, and the fact that First Contentful Paint fires before Start Render actually makes perfect sense if you look at the changes made to the specification in order for Safari to implement it.

The [specification notes that](https://w3c.github.io/paint-timing/#paint):

> ...the user agent has performed a "paint" (or "render") when it has converted the render tree to pixels on the screen.

Ok, so far so good. But when handling the WebKit implementation, Noam and the folks that were involved from Safari felt that "pixels on the screen" wasn't possible to make cross-browser interoperable. There is some additional context in the spec now that makes it clear that "pixels on screen" isn't exactly super precise, or even potentially feasible to measure, for all browsers, and gives guidance on how browsers should implement (emphasis mine):

> NOTE: The rendering pipeline is very complex, and the timestamp should be the latest timestamp the user agent is able to note in this pipeline (best effort). Typically the *time at which the frame is submitted to the OS for display is recommended for this API*.

So, we're not necessarily measuring the moment at which that contentful paint actually occurs. Instead, the specification now defines it as measuring the point at which the frame is submitted for display (or, as close to that point as possible).

It's a small distinction but an important one: as specified, this means First Contentful Paint is going to fire before that content every reaches the screen. That explains why we see First Contentful Paint frequently firing before we see content. Just how \_much\_ earlier First Contentful Paint will fire depends on the browser engine and their implementation.

This distinction and the difference in how browser rendering engines work means First Contentful Paint is pretty unreliable for cross-browser comparison.

As Noam mentioned to me, lot of rendering in Safari is done at the operating system level and the browser doesn't know when that rendering exactly occurs. This means Safari has a limit to how precise it can be with the timestamp.

Chrome, on the other hand tries hard, tries hard to provide a timestamp of when the paint actually does occur. As a result, the gap between when First Contentful Paint is fired and that content is visually displayed is significantly smaller in Chrome (and Firefox) than in Safari.

This appears to largely be a side-effect of the difference between interoperability in practice and in reality. The specification tries to provide a consistent playing field, but the reality is that different browser architectures have different restrictions on when they can fire the necessary timestamps to report First Contentful (or if not restrictions, then perhaps how important it is for them to try to work around those restrictions to get more accurate timings). It's one of those "specs in the real world" moments.

## So....what does this mean for me?

While the gap is much bigger in Safari than the other browsers, how much this matters to you depends on what you're hoping to do with First Contentful Paint. 

If you want to look at First Contentful Paint in the context of a single browser, you're more or less ok. For example, if you want to improve First Contentful Paint in Safari, then by all means, watch how the metric changes when you make changes. Just keep in mind that, particularly in the case of Safari, it's quite likely there's a gap between what the metric is reporting and when your visitors are actually seeing that content. (The gap does seem particularly large, so I'm hoping that eventually the gap could be tightened up a bit with some more exploration.)

When you want to compare First Contentful Paint across browsers, that's where you have to tread with a bit more caution. Seeing First Contentful Paint differ from one browser to the next is to be expected, as we've seen. So if you're seeing subtle differences (and you will) between browsers, that doesn't necessarily mean you have an issue. If you end up seeing big gaps between one browser and another, that's when you'll want to dig in.

This is also a *great* example of why you need to pair real-user data with synthetic data. In this case, the synthetic data can help you to validate what you're seeing in real-user data. If you spot a gap in a browser, being able to validate it visually in synthetic data (using something like the filmstrip view, for example) can help you to identify if it's something that warrants additional development effort on your part or not.