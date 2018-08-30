const path = require('path');
const del = require('del');
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const excludeGitignore = require('gulp-exclude-gitignore');
const coveralls = require('gulp-coveralls');

// Initialize the babel transpiler so ES2015 files gets compiled when they're loaded
require('@babel/register');

gulp.task('static', function () {
  return gulp.src('**/*.js')
    .pipe(plumber())
    .pipe(excludeGitignore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('watch', function () {
  gulp.watch(['lib/**/*.js', 'test/**'], ['test']);
});

gulp.task('coveralls', function () {
  return gulp.src(path.join(__dirname, 'coverage/lcov.info'))
    .pipe(coveralls());
});

gulp.task('clean', function () {
  return del('dist');
});

gulp.task('babel', gulp.series('clean', function () {
  return gulp.src('lib/**/*.js')
    .pipe(plumber())
    .pipe(babel())
    .pipe(gulp.dest('dist'));
}));

gulp.task('prepare', gulp.series('babel'));

gulp.task('default', gulp.series('static', 'coveralls'));
