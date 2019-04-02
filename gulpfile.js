const del = require('del');
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const excludeGitignore = require('gulp-exclude-gitignore');

// Initialize the babel transpiler so ES2015 files gets compiled when they're loaded
require('@babel/register');

gulp.task('lint', function () {
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

gulp.task('clean', function () {
  return del('dist');
});

gulp.task('babel', () => {
  return gulp.src('lib/**/*.js')
    .pipe(plumber())
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('prepare', gulp.series('clean', 'babel'));

gulp.task('default', gulp.series('lint'));
